const path = require("path");
const XLSX = require("xlsx");
const prisma = require("../prisma/prismaClient");

const DATA_FILE = path.join(
  __dirname,
  "..",
  "data",
  "Course alloc-FA-25-26 EVEN.xlsx"
);
const SHEET_NAME = "Faculty Details";

const FACULTY_POSITIONS = [
  "professor",
  "associate professor",
  "assistant professor",
];

function isFacultyPosition(pos) {
  if (!pos) return false;
  const lower = String(pos).toLowerCase();
  return FACULTY_POSITIONS.some((fp) => lower.includes(fp));
}

function parseFacultySheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map((c) => String(c)).join(" ").toLowerCase();
    if (joined.includes("s.no") && joined.includes("faculty name")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.error("Could not find header row in", SHEET_NAME);
    return [];
  }

  const faculty = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const sno = row[0];
    const empId = row[1];
    const name = row[2];
    const position = row[3];
    const mobile = row[4];
    const email = row[5];

    if (!empId || !name || String(name).trim() === "") continue;
    if (!isFacultyPosition(position)) continue;

    faculty.push({
      empId: String(empId).trim(),
      name: String(name).trim(),
      position: String(position).trim(),
      mobile: mobile ? String(mobile).trim() : null,
      email: email ? String(email).trim() : null,
    });
  }

  return faculty;
}

async function main() {
  const fs = require("fs");
  if (!fs.existsSync(DATA_FILE)) {
    console.error("Data file not found:", DATA_FILE);
    process.exit(1);
  }

  console.log("Reading:", path.relative(process.cwd(), DATA_FILE));

  const workbook = XLSX.readFile(DATA_FILE);
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    console.error(`Sheet "${SHEET_NAME}" not found. Available:`, workbook.SheetNames);
    process.exit(1);
  }

  const faculty = parseFacultySheet(sheet);
  console.log(`Parsed ${faculty.length} faculty members`);

  let inserted = 0;
  let updated = 0;

  try {
    for (const f of faculty) {
      const existing = await prisma.faculty.findUnique({
        where: { empId: f.empId },
      });

      if (existing) {
        await prisma.faculty.update({
          where: { empId: f.empId },
          data: {
            name: f.name,
            position: f.position,
            mobile: f.mobile,
            email: f.email,
          },
        });
        updated++;
      } else {
        await prisma.faculty.create({
          data: {
            empId: f.empId,
            name: f.name,
            position: f.position,
            mobile: f.mobile,
            email: f.email,
          },
        });
        inserted++;
      }
    }

    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error seeding faculty:", err);
  prisma
    .$disconnect()
    .catch(() => process.exit(1))
    .finally(() => process.exit(1));
});
