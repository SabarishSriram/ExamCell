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
const SECTION_CODE_PATTERN = /^[A-Z]{1,2}\d$/i;

/**
 * Extract the starting academic year from the data filename.
 * e.g. "Course alloc-FA-25-26 EVEN.xlsx" → 25
 */
function extractAcademicYear() {
  const match = path.basename(DATA_FILE).match(/(\d{2})-(\d{2})/)
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Compute 2-digit admission year for a given year level.
 * In academic year 25-26: I Year admitted 25, II Year admitted 24, III Year admitted 23
 */
function getAdmissionYearSuffix(yearKey) {
  const acadYear = extractAcademicYear();
  if (!acadYear) return null;
  const offsets = { I_YEAR: 0, II_YEAR: 1, III_YEAR: 2, IV_YEAR: 3 };
  const offset = offsets[yearKey];
  if (offset === undefined) return null;
  return String(acadYear - offset).padStart(2, '0');
}

function stripFacultyName(s) {
  if (!s || typeof s !== "string") return "";
  return String(s)
    .replace(/\s*(CC|CC lab|CC-Lab|CC Lab|Lab)\s*$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
}

function canonicalize(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/^(dr\.?|ms\.?|mrs\.?|mr\.?)\s*/i, "")
    .replace(/[.\-_,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(canon) {
  return canon.split(/\s+/).filter((t) => t.length > 0);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function findBestFacultyMatch(rawName, facultyList) {
  const stripped = stripFacultyName(rawName);
  const canon = canonicalize(stripped);
  if (!canon) return null;
  const tokens = tokenize(canon);

  let bestEntry = null;
  let bestScore = -1;

  for (const entry of facultyList) {
    const entryCanon = entry.canon;
    const entryTokens = entry.tokens;

    if (canon === entryCanon) return entry;

    const shorter = tokens.length <= entryTokens.length ? tokens : entryTokens;
    const longer = tokens.length <= entryTokens.length ? entryTokens : tokens;

    let tokenMatches = 0;
    for (const st of shorter) {
      for (const lt of longer) {
        if (st === lt || lt.includes(st) || st.includes(lt)) { tokenMatches++; break; }
        if (st.length > 3 && lt.length > 3 && levenshtein(st, lt) <= 2) { tokenMatches++; break; }
      }
    }

    const overlap = tokenMatches / Math.max(shorter.length, 1);
    const nameDist = levenshtein(canon, entryCanon);
    const maxLen = Math.max(canon.length, entryCanon.length, 1);
    const similarity = 1 - nameDist / maxLen;

    const score = overlap * 0.6 + similarity * 0.4;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore >= 0.65) return bestEntry;
  return null;
}

function buildFacultyList(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map((c) => String(c)).join(" ").toLowerCase();
    if (joined.includes("s.no") && joined.includes("faculty name")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const list = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const empId = rows[r][1];
    const name = rows[r][2];
    if (!empId || !name || !String(name).trim()) continue;
    const rawName = String(name).trim();
    const canon = canonicalize(rawName);
    list.push({
      empId: String(empId).trim(),
      name: rawName,
      canon,
      tokens: tokenize(canon),
    });
  }
  return list;
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

        if (!sectionStr) continue;
        if (!SECTION_CODE_PATTERN.test(sectionStr)) continue;

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

async function seedFromParsed(parsed, facultyList) {
  const stats = { courses: 0, sections: 0, faculty: 0, offerings: 0, matched: 0, unmatched: [] };
  const facultyCache = new Map();
  let unknownFacultyCounter = 0;

  const getOrCreateFaculty = async (rawName) => {
    if (!rawName || !String(rawName).trim()) return null;
    const stripped = stripFacultyName(rawName);
    const cacheKey = canonicalize(stripped);
    if (!cacheKey) return null;
    if (facultyCache.has(cacheKey)) return facultyCache.get(cacheKey);

    const match = findBestFacultyMatch(rawName, facultyList);
    let faculty;
    if (match) {
      faculty = await prisma.faculty.upsert({
        where: { empId: match.empId },
        update: { name: match.name },
        create: { empId: match.empId, name: match.name },
      });
      stats.matched++;
    } else {
      unknownFacultyCounter++;
      const empId = `UGALOC_${String(unknownFacultyCounter).padStart(4, "0")}`;
      faculty = await prisma.faculty.upsert({
        where: { empId },
        update: { name: stripped },
        create: { empId, name: stripped },
      });
      stats.unmatched.push(stripped);
    }
    facultyCache.set(cacheKey, faculty);
    return faculty;
  };

  await prisma.courseOffering.deleteMany({});

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
        const rawSection = entry.section;
        if (!rawSection) continue;

        // Suffix section with admission year (e.g. U1 → U1-24)
        const yearSuffix = getAdmissionYearSuffix(yearKey);
        const sectionCode = yearSuffix ? `${rawSection}-${yearSuffix}` : rawSection;

        // Ensure the suffixed section exists
        await prisma.section.upsert({
          where: { code: sectionCode },
          update: {},
          create: { code: sectionCode },
        });

        const faculty = entry.faculty ? await getOrCreateFaculty(entry.faculty) : null;
        if (faculty) stats.faculty = Math.max(stats.faculty, facultyCache.size);

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

  const facultyList = facultySheet ? buildFacultyList(facultySheet) : [];
  console.log(`Faculty Details: ${facultyList.length} names for lookup`);

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
    const stats = await seedFromParsed(parsed, facultyList);
    console.log("Seeded:", { courses: stats.courses, sections: stats.sections, matched: stats.matched, offerings: stats.offerings });
    if (stats.unmatched.length > 0) {
      console.log("Unmatched faculty (created with UGALOC_ IDs):", stats.unmatched);
    }
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
