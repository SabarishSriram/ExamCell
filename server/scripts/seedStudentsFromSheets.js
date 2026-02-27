const path = require("path");
const XLSX = require("xlsx");
const prisma = require("../prisma/prismaClient");

const DATA_FILE = path.join(__dirname, "..", "data", "2nd Year.xlsx");

// Section codes we expect (for extracting from combined strings)
const SECTION_PATTERN = /\b(U1|U2|V1|V2|W1|W2|X1|X2|Y1|Y2|Z1|Z2|AA1|AA2|T1|T2|S1|S2|R1|R2|P1|P2|Q1|Q2|AH1|AH2|AI1|AI2|AJ1|AJ2|AK1|AK2|AL1|AL2|AO1|AP1|AC2|AD2|AE2)\b/i;

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickColumn(row, exactKeys, fuzzyKeys) {
  for (const key of exactKeys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  const normalizedTargets = (fuzzyKeys || []).map(normalizeKey);
  for (const [rawKey, value] of Object.entries(row)) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const norm = normalizeKey(rawKey);
    if (normalizedTargets.includes(norm) || normalizedTargets.some((t) => norm.includes(t))) {
      return String(value).trim();
    }
  }
  return null;
}

function extractSectionFromSheetName(sheetName) {
  const match = String(sheetName).match(SECTION_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

function extractSectionFromValue(val) {
  const match = String(val || "").match(SECTION_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

function parseRegNoAndSection(val) {
  if (!val || typeof val !== "string") return { regNo: null, section: null };
  const s = val.trim();
  const section = extractSectionFromValue(s);
  const regNoMatch = s.match(/RA\d{7,}/);
  const regNo = regNoMatch ? regNoMatch[0] : null;
  return { regNo, section };
}

function parseNameAndSection(val) {
  if (!val || typeof val !== "string") return { name: val.trim(), section: null };
  const s = val.trim();
  const section = extractSectionFromValue(s);
  const name = section ? s.replace(new RegExp(`\\s*${section}\\s*$`, "i"), "").trim() : s;
  return { name, section };
}

function isHeaderRow(rowArr, minCols = 2) {
  if (!Array.isArray(rowArr) || rowArr.length < minCols) return false;
  const str = rowArr.map((c) => String(c ?? "")).join(" ").toLowerCase();
  const hasReg = /reg|register|regno|registrat/.test(str);
  const hasName = /name|student|namelist/.test(str);
  const hasOther = /section|branch|email|phone|mobile|specializ|srm|stu\.email|stu\.mobile/.test(str);
  return hasReg && (hasName || hasOther);
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    if (isHeaderRow(row)) return { headerRow: i, cols: row };
  }
  return { headerRow: 0, cols: rows[0] || [] };
}

function parseSheet(sheet, sheetName) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const { headerRow, cols } = findHeaderRow(raw);

  const headerToIdx = {};
  (cols || []).forEach((cell, idx) => {
    const k = String(cell ?? `__col${idx}`).trim();
    if (k) headerToIdx[k] = idx;
  });

  const defaultSection = extractSectionFromSheetName(sheetName);
  const rows = [];

  for (let r = headerRow + 1; r < raw.length; r++) {
    const arr = raw[r];
    if (!Array.isArray(arr)) continue;

    const row = {};
    Object.entries(headerToIdx).forEach(([h, idx]) => {
      const v = arr[idx];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        row[h] = arr[idx];
      }
    });

    let regNo = pickColumn(
      row,
      ["Register Number", "Register No", "Reg No", "Reg. No", "REGNO", "Register Nur Section", "Register Nur"],
      ["regno", "regnumber", "registerno", "registrat", "reg"]
    );
    let name = pickColumn(row, ["Name", "Student Name", "Student", "Name of the Section", "NAME"], [
      "name",
      "studentname",
      "studentnam",
      "student",
    ]);
    let section = pickColumn(row, ["Section", "SECTION", "Sec", "SEC"], ["section", "sec"]);
    const specialization = pickColumn(
      row,
      ["Specialization", "Branch", "Department", "Programme", "Specializatio"],
      ["specialization", "branch", "department", "programme", "specializ"]
    );
    const email = pickColumn(
      row,
      ["SRM Mail ID", "Email ID", "Email", "Mail ID", "SRM Mail", "Stu.Email", "SRM MAIL IC"],
      ["email", "mail", "srmmail", "studentemail", "srmist"]
    );
    const phone = pickColumn(
      row,
      ["Phone Number", "Phone", "Mobile Number", "Contact Number", "Mobile", "Stu.Mobile"],
      ["phone", "mobile", "contact", "studentmobile"]
    );

    if (regNo && regNo.includes(" ")) {
      const parsed = parseRegNoAndSection(regNo);
      if (parsed.regNo) regNo = parsed.regNo;
      if (parsed.section && !section) section = parsed.section;
    }

    if (name && !section) {
      const parsed = parseNameAndSection(name);
      if (parsed.section) {
        section = parsed.section;
        name = parsed.name;
      }
    }

    if (!section && defaultSection) section = defaultSection;
    if (!regNo || !name) continue;

    const sectionCode = section || defaultSection || "UNKNOWN";
    rows.push({
      regNo: String(regNo).trim(),
      name: String(name).trim(),
      sectionCode,
      specialization: specialization || null,
      email: email || null,
      phone: phone || null,
    });
  }

  return rows;
}

async function importWorkbook(filePath, stats) {
  const workbook = XLSX.readFile(filePath);
  const seenSections = new Set();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = parseSheet(sheet, sheetName);

    for (const row of rows) {
      const { regNo, name, sectionCode, specialization, email, phone } = row;

      if (!seenSections.has(sectionCode)) {
        await prisma.section.upsert({
          where: { code: sectionCode },
          update: {},
          create: { code: sectionCode },
        });
        seenSections.add(sectionCode);
      }

      await prisma.student.upsert({
        where: { regNo },
        update: {
          name,
          sectionCode,
          specialization,
          phone,
          email,
        },
        create: {
          regNo,
          name,
          sectionCode,
          specialization,
          phone,
          email,
        },
      });

      stats.insertedOrUpdated += 1;
    }

    if (rows.length > 0) {
      console.log(`  [${sheetName}] ${rows.length} students`);
    }
  }
}

async function main() {
  const fs = require("fs");
  if (!fs.existsSync(DATA_FILE)) {
    console.error("Data file not found:", DATA_FILE);
    process.exit(1);
  }

  console.log("Importing from:", path.relative(process.cwd(), DATA_FILE));

  const stats = { insertedOrUpdated: 0 };

  try {
    await importWorkbook(DATA_FILE, stats);
    console.log("Done.");
    console.log("Total students inserted/updated:", stats.insertedOrUpdated);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error while seeding students:", err);
  prisma
    .$disconnect()
    .catch(() => process.exit(1))
    .finally(() => process.exit(1));
});
