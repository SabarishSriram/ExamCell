/**
 * Parses the UG Allocation sheet from Course alloc-FA-25-26 EVEN.xlsx
 * and seeds the database with Course, Section, Faculty, and CourseOffering records.
 *
 * Run: node scripts/parseUGAllocation.js
 */

const path = require("path");
const XLSX = require("xlsx");
const prisma = require("../prisma/prismaClient");

const DATA_FILE = path.join(__dirname, "..", "data", "Course alloc-FA-25-26 EVEN.xlsx");
const UG_SHEET = "UG Allocation";
const FACULTY_SHEET = "Faculty Details";

const COURSE_CODE_PATTERN = /^21[A-Z]{2,4}\d{3}[A-Z]?$/i;

function normalizeFacultyName(s) {
  if (!s || typeof s !== "string") return "";
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/\s*(CC|CC lab|CC-Lab|Lab)\s*$/i, "")
    .trim();
}

function buildFacultyNameMap(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map((c) => String(c)).join(" ").toLowerCase();
    if (joined.includes("s.no") && joined.includes("faculty name")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return new Map();

  const map = new Map();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const empId = rows[r][1];
    const name = rows[r][2];
    if (!empId || !name) continue;
    const n = normalizeFacultyName(String(name).trim());
    if (n) map.set(n.toLowerCase(), { empId: String(empId).trim(), name: String(name).trim() });
  }
  return map;
}

function extractSlot(str) {
  if (!str || typeof str !== "string") return null;
  const m = str.match(/\(?\s*([A-G])\s*[Ss]lot\s*\)?/i) || str.match(/\b([A-G])\s*[Ss]lot\b/i);
  return m ? m[1].toUpperCase() : null;
}

function parseCourseHeader(cell) {
  const s = String(cell || "").trim();
  if (!s) return null;
  const codeMatch = s.match(/(21[A-Z]{2,4}\d{3}[A-Z]?)/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;
  const rest = code ? s.replace(codeMatch[0], "").trim() : s;
  const slot = extractSlot(rest) || extractSlot(s);
  const name = rest
    .replace(/\(?\s*[A-G]\s*[Ss]lot\s*\)?/gi, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  return { code, name: name || s, slot };
}

function findCourseBlocks(headerRow) {
  const blocks = [];
  let i = 0;
  while (i < headerRow.length) {
    const cell = headerRow[i];
    const parsed = parseCourseHeader(cell);
    if (parsed && parsed.code) {
      const nextCell = headerRow[i + 1];
      const nextParsed = nextCell && !COURSE_CODE_PATTERN.test(String(nextCell).trim()) ? parseCourseHeader(nextCell) : null;
      const name = nextParsed?.name || parsed.name;
      const slot = nextParsed?.slot || parsed.slot || extractSlot(headerRow[i + 2] || headerRow[i + 1] || "");
      blocks.push({
        startCol: i,
        code: parsed.code,
        name,
        slot,
      });
      i += nextParsed ? 2 : 1;
    } else {
      i++;
    }
  }
  return blocks;
}

function parseUGAllocation(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const result = { I_YEAR: {}, II_YEAR: {}, III_YEAR: {} };

  const yearMarkers = [
    { label: "I_YEAR", search: "i year", rowOffset: 1, swapDeptSection: true },
    { label: "II_YEAR", search: "ii year", rowOffset: 1, swapDeptSection: false },
    { label: "III_YEAR", search: "iii year", rowOffset: 1, swapDeptSection: false },
  ];

  for (let yi = 0; yi < yearMarkers.length; yi++) {
    const { label, search, rowOffset, swapDeptSection } = yearMarkers[yi];
    const nextMarker = yearMarkers[yi + 1];
    let yearStart = -1;
    let yearEnd = rows.length;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const joined = (Array.isArray(row) ? row : []).map((c) => String(c)).join(" ").toLowerCase();
      if (joined.includes(search)) {
        yearStart = r;
        break;
      }
    }
    if (yearStart < 0) continue;

    for (let r = yearStart + 1; r < rows.length; r++) {
      const row = rows[r];
      const joined = (Array.isArray(row) ? row : []).map((c) => String(c)).join(" ").toLowerCase();
      if (nextMarker && joined.includes(nextMarker.search.replace(/\s/g, " "))) {
        yearEnd = r;
        break;
      }
    }

    const headerRow = rows[yearStart + rowOffset];
    if (!headerRow) continue;

    const blocks = findCourseBlocks(headerRow);
    if (blocks.length === 0) continue;

    for (const block of blocks) {
      const col = block.startCol;
      const entries = [];
      const seenSections = new Set();

      for (let r = yearStart + rowOffset + 1; r < yearEnd; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        const a = row[col];
        const b = row[col + 1];
        const faculty = row[col + 2];
        const section = swapDeptSection ? b : a;
        const dept = swapDeptSection ? a : b;

        const sectionStr = String(section || "").trim();
        const facultyStr = String(faculty || "").trim();

        if (!sectionStr || sectionStr.match(/^(ios students|nanotechnology|s\.no\.?)$/i)) continue;
        if (sectionStr.match(/^[\d.]+$/) && !facultyStr) continue;

        const key = `${block.code}-${sectionStr}`;
        if (seenSections.has(key)) continue;
        seenSections.add(key);

        entries.push({
          section: sectionStr,
          dept: dept ? String(dept).trim() : undefined,
          faculty: facultyStr || undefined,
        });
      }

      if (entries.length > 0) {
        result[label][block.code] = {
          code: block.code,
          name: block.name,
          slot: block.slot,
          data: entries,
        };
      }
    }
  }

  return result;
}

async function seedFromParsed(parsed, facultyNameMap) {
  const stats = { courses: 0, sections: 0, faculty: 0, offerings: 0 };
  const facultyByNormName = new Map();
  let unknownFacultyCounter = 0;

  const getOrCreateFaculty = async (rawName) => {
    if (!rawName || !String(rawName).trim()) return null;
    const norm = normalizeFacultyName(rawName);
    const key = norm.toLowerCase();
    if (facultyByNormName.has(key)) return facultyByNormName.get(key);

    const fromSheet = facultyNameMap.get(key);
    let faculty;
    if (fromSheet) {
      faculty = await prisma.faculty.upsert({
        where: { empId: fromSheet.empId },
        update: { name: fromSheet.name },
        create: {
          empId: fromSheet.empId,
          name: fromSheet.name,
        },
      });
    } else {
      unknownFacultyCounter++;
      const empId = `UGALOC_${String(unknownFacultyCounter).padStart(4, "0")}`;
      faculty = await prisma.faculty.upsert({
        where: { empId },
        update: { name: norm },
        create: { empId, name: norm },
      });
    }
    facultyByNormName.set(key, faculty);
    return faculty;
  };

  const yearLabels = { I_YEAR: "1st Year", II_YEAR: "2nd Year", III_YEAR: "3rd Year" };

  for (const [yearKey, courses] of Object.entries(parsed)) {
    const yearLabel = yearLabels[yearKey] || yearKey;
    if (!courses || typeof courses !== "object") continue;

    for (const course of Object.values(courses)) {
      if (!course || !course.code) continue;

      await prisma.course.upsert({
        where: { code: course.code },
        update: { name: course.name, type: "Core", year: yearLabel },
        create: { code: course.code, name: course.name, type: "Core", year: yearLabel },
      });
      stats.courses++;

      const entries = course.data || course.sections || [];
      for (const entry of entries) {
        const sectionCode = entry.section;
        if (!sectionCode) continue;

        await prisma.section.upsert({
          where: { code: sectionCode },
          update: {},
          create: { code: sectionCode },
        });
        if (!stats.sections) stats.sections = await prisma.section.count();

        const faculty = entry.faculty ? await getOrCreateFaculty(entry.faculty) : null;
        if (faculty) stats.faculty = Math.max(stats.faculty, facultyByNormName.size);

        const existing = await prisma.courseOffering.findFirst({
          where: { courseCode: course.code, sectionCode, yearLabel },
        });
        if (existing) {
          await prisma.courseOffering.update({
            where: { id: existing.id },
            data: { slot: course.slot || null, facultyEmpId: faculty?.empId ?? null },
          });
        } else {
          await prisma.courseOffering.create({
            data: {
              yearLabel,
              slot: course.slot || null,
              courseCode: course.code,
              facultyEmpId: faculty?.empId ?? null,
              sectionCode,
            },
          });
        }
        stats.offerings++;
      }
    }
  }

  stats.sections = await prisma.section.count();
  return stats;
}

async function main() {
  const fs = require("fs");
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(DATA_FILE)) {
    console.error("Data file not found:", DATA_FILE);
    process.exit(1);
  }

  console.log("Parsing:", path.relative(process.cwd(), DATA_FILE));

  const workbook = XLSX.readFile(DATA_FILE);
  const ugSheet = workbook.Sheets[UG_SHEET];
  const facultySheet = workbook.Sheets[FACULTY_SHEET];

  if (!ugSheet) {
    console.error(`Sheet "${UG_SHEET}" not found.`);
    process.exit(1);
  }

  const facultyNameMap = facultySheet ? buildFacultyNameMap(facultySheet) : new Map();
  console.log(`Faculty Details: ${facultyNameMap.size} names for lookup`);

  const parsed = parseUGAllocation(ugSheet);
  const totalCourses = Object.values(parsed).reduce((sum, c) => sum + Object.keys(c).length, 0);
  const totalEntries = Object.values(parsed).reduce(
    (sum, courses) => sum + Object.values(courses).reduce((s, c) => s + (c.data?.length || c.sections?.length || 0), 0),
    0
  );
  console.log(`Parsed: ${totalCourses} courses, ${totalEntries} allocations`);

  if (dryRun) {
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  try {
    const stats = await seedFromParsed(parsed, facultyNameMap);
    console.log("Seeded:", stats);
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  prisma
    .$disconnect()
    .catch(() => process.exit(1))
    .finally(() => process.exit(1));
});
