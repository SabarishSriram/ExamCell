const path = require("path");
const readline = require("readline");
const XLSX = require("xlsx");
const prisma = require("../prisma/prismaClient");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || "").trim().toLowerCase());
    });
  });
}

const DATA_FILE = path.join(
  __dirname,
  "..",
  "data",
  "Course alloc-FA-25-26 EVEN.xlsx"
);
const SHEET_NAME = "FA Details";
const MATCH_THRESHOLD = 0.9;
const SECTION_PATTERN = /^[A-Z]{1,2}[12]$/;

/**
 * Extract 2-digit year from a registration number like RA2411028010001 → "24"
 */
function extractYearFromRegNo(regNo) {
  if (!regNo) return null;
  const match = String(regNo).match(/RA(\d{2})/i);
  return match ? match[1] : null;
}

/**
 * Suffix a section code with the year extracted from a reg number.
 * e.g. ("U1", "24") → "U1-24"
 */
function suffixSectionWithYear(sectionCode, year) {
  if (!year || !sectionCode) return sectionCode;
  if (sectionCode.endsWith(`-${year}`)) return sectionCode;
  return `${sectionCode}-${year}`;
}

// ── Dice coefficient (bigram similarity) ────────────────────────────

function getBigrams(str) {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

function diceCoefficient(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\b(dr|mrs|mr|ms|prof)\.?\s*/g, "")
    .replace(/\b[a-z]\.\s*/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Sheet parsing ───────────────────────────────────────────────────

function parseFASheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const entries = [];
  let faColIdx = 5; // default for I yr / II yr blocks (no header row)
  let regNoFromColIdx = null; // column index for "Reg No From"

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Detect header rows that explicitly label "Faculty Advisor"
    let isHeader = false;
    for (let j = 0; j < row.length; j++) {
      const cellVal = String(row[j]).toLowerCase().trim();
      if (cellVal === "faculty advisor") {
        faColIdx = j;
        isHeader = true;
      }
      // Also detect "Reg No From" column
      if (cellVal.includes("reg") && cellVal.includes("from")) {
        regNoFromColIdx = j;
      }
    }
    if (isHeader) continue;

    const sectionCode = String(row[3] || "").trim().toUpperCase();
    if (!SECTION_PATTERN.test(sectionCode)) continue;

    const faName = String(row[faColIdx] || "").trim();
    if (!faName) continue;

    // Try to extract year from reg no columns (after FA column)
    let year = null;
    if (regNoFromColIdx !== null) {
      year = extractYearFromRegNo(String(row[regNoFromColIdx] || ""));
    }
    // Fallback: scan columns after FA for any RA\d{2} pattern
    if (!year) {
      for (let j = faColIdx + 1; j < row.length; j++) {
        const cellStr = String(row[j] || "").trim();
        year = extractYearFromRegNo(cellStr);
        if (year) break;
      }
    }

    const suffixedSection = suffixSectionWithYear(sectionCode, year);
    entries.push({ sectionCode: suffixedSection, faName });
  }

  return entries;
}

// ── Fuzzy matching ──────────────────────────────────────────────────

function findBestFacultyMatch(faName, facultyList) {
  const normalizedFA = normalizeName(faName);
  if (!normalizedFA) return { match: null, score: 0 };

  let bestMatch = null;
  let bestScore = 0;

  for (const faculty of facultyList) {
    const normalizedDB = normalizeName(faculty.name);
    if (!normalizedDB) continue;

    const score = diceCoefficient(normalizedFA, normalizedDB);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faculty;
    }
  }

  return { match: bestMatch, score: bestScore };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const fs = require("fs");
  if (!fs.existsSync(DATA_FILE)) {
    console.error("Data file not found:", DATA_FILE);
    process.exit(1);
  }

  const workbook = XLSX.readFile(DATA_FILE);
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    console.error(
      `Sheet "${SHEET_NAME}" not found. Available:`,
      workbook.SheetNames
    );
    process.exit(1);
  }

  const entries = parseFASheet(sheet);
  console.log(`Parsed ${entries.length} section-FA pairs from sheet\n`);

  const allFaculty = await prisma.faculty.findMany();
  if (allFaculty.length === 0) {
    console.error("No faculty in DB. Run seed:faculty first.");
    process.exit(1);
  }
  console.log(`Found ${allFaculty.length} faculty records in DB\n`);

  const allSections = await prisma.section.findMany();
  const sectionSet = new Set(allSections.map((s) => s.code));

  const linked = [];
  const unmatched = [];
  const noSection = [];
  const processed = new Set();

  for (const { sectionCode, faName } of entries) {
    if (processed.has(sectionCode)) continue;
    processed.add(sectionCode);

    if (!sectionSet.has(sectionCode)) {
      noSection.push({ sectionCode, faName });
      continue;
    }

    const { match, score } = findBestFacultyMatch(faName, allFaculty);

    if (match && score >= MATCH_THRESHOLD) {
      await prisma.section.update({
        where: { code: sectionCode },
        data: { advisorEmpId: match.empId },
      });
      linked.push({
        sectionCode,
        faName,
        matchedName: match.name,
        empId: match.empId,
        score: score.toFixed(3),
      });
    } else {
      unmatched.push({
        sectionCode,
        faName,
        bestMatch: match,
        bestCandidate: match ? match.name : "(none)",
        score: match ? score.toFixed(3) : "0",
      });
    }
  }

  console.log("=== LINKED ===");
  for (const l of linked) {
    console.log(
      `  ${l.sectionCode}: "${l.faName}" -> ${l.matchedName} (${l.empId}) [score: ${l.score}]`
    );
  }

  if (unmatched.length > 0) {
    console.log("\n=== UNMATCHED (below threshold) – manual approval ===\n");
    for (const u of unmatched) {
      const promptText =
        u.bestMatch
          ? `${u.sectionCode} "${u.faName}" → best match: ${u.bestCandidate} (${u.bestMatch.empId}) [score: ${u.score}]. Link? (y/n): `
          : `${u.sectionCode} "${u.faName}" – no candidate in DB. Skip (Enter): `;

      const answer = await ask(promptText);
      if (answer === "y" && u.bestMatch) {
        await prisma.section.update({
          where: { code: u.sectionCode },
          data: { advisorEmpId: u.bestMatch.empId },
        });
        linked.push({
          sectionCode: u.sectionCode,
          faName: u.faName,
          matchedName: u.bestMatch.name,
          empId: u.bestMatch.empId,
          score: u.score,
        });
        console.log(`  → Linked ${u.sectionCode} to ${u.bestMatch.name}\n`);
      } else {
        console.log(`  → Skipped ${u.sectionCode}\n`);
      }
    }
  }

  if (noSection.length > 0) {
    console.log("\n=== SECTION NOT IN DB (skipped) ===");
    for (const n of noSection) {
      console.log(`  ${n.sectionCode}: "${n.faName}"`);
    }
  }

  console.log(
    `\nSummary: ${linked.length} linked, ${unmatched.length} unmatched, ${noSection.length} sections not in DB`
  );
}

main()
  .catch((err) => {
    console.error("Error seeding faculty advisors:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
