# Course & UG Allocation Schema

This document describes the database schema for courses, faculty, sections, and course offerings—data that was previously mocked in `courseFaculty.js` and is now parsed from the UG Allocation Excel sheet.

## Overview

The UG Allocation sheet (`Course alloc-FA-25-26 EVEN.xlsx`) contains:
- **UG Allocation** tab: I Year, II Year, III Year course blocks with section–dept–faculty mappings
- **Faculty Details** tab: Faculty IDs, names, positions, contact info (used for matching faculty in allocations)

---

## Database Models (Prisma)

### Course

Course master data (code, name, type, year).

| Field  | Type    | Description                          |
|--------|---------|--------------------------------------|
| code   | String  | Primary key, e.g. `21CSC204J`        |
| name   | String  | Full name, e.g. "Design and Analysis of Algorithms" |
| type   | String? | e.g. Core, Elective                  |
| year   | String? | e.g. "1st Year", "2nd Year", "3rd Year" |

**Relations:** `offerings` → CourseOffering[]

---

### Faculty

Faculty member (from Faculty Details or created during UG Allocation parse).

| Field    | Type   | Description                    |
|----------|--------|--------------------------------|
| id       | Int    | Auto-increment PK              |
| empId    | String | Unique, e.g. `100164` or `UGALOC_0001` |
| name     | String | Full name                      |
| position | String?| e.g. Professor, Associate Professor |
| mobile   | String?| Phone                          |
| email    | String?| Email                          |

**Note:** Faculty from the Faculty Details sheet use numeric `empId`. Faculty only found in UG Allocation get synthetic IDs like `UGALOC_0001`.

**Relations:** `offerings` → CourseOffering[], `advisedSections` → Section[]

---

### Section

Section code (e.g. U1, V1, AH1) used for students and course offerings.

| Field         | Type    | Description           |
|---------------|---------|-----------------------|
| code          | String  | Primary key           |
| advisorEmpId  | String? | FK to Faculty.empId   |

**Relations:** `students`, `offerings`, `examSections`, `reports`

---

### CourseOffering

Maps a course to a section, year, slot, and faculty. One row per (course, section, year).

| Field       | Type   | Description                                  |
|-------------|--------|----------------------------------------------|
| id          | Int    | Auto-increment PK                            |
| yearLabel   | String?| e.g. "1st Year", "2nd Year", "3rd Year"      |
| slot        | String?| Time slot, e.g. A, B, C, D, E, F, G          |
| courseCode  | String | FK to Course.code                            |
| facultyEmpId | String?| FK to Faculty.empId                          |
| sectionCode | String?| FK to Section.code                           |

**Relations:** `course` → Course, `faculty` → Faculty, `section` → Section

---

## Mock Data Structure (Legacy)

The old `courseFaculty.js` mock structure:

```javascript
{
  I_YEAR: {
    OOPS: {
      code: "21CSC101T",
      name: "Object Oriented Design and Programming",
      slot: "G",
      sections: [{ sl, dept, section, faculty }, ...]
    }
  },
  II_YEAR: {
    DAA: {
      code: "21CSC204J",
      name: "Design and Analysis of Algorithms",
      slot: "B",
      data: [{ section, dept?, faculty }, ...]
    }
  },
  III_YEAR: { ... }
}
```

- **I Year** uses `sections` array with `{ sl, dept, section, faculty }`
- **II/III Year** uses `data` array with `{ section, dept?, faculty }`

---

## Parsed Output Shape

The `parseUGAllocation.js` script produces this structure:

```javascript
{
  I_YEAR: {
    "21CSC101T": {
      code: "21CSC101T",
      name: "Object Oriented design and programming",
      slot: "G",
      data: [{ section, dept, faculty? }, ...]
    }
  },
  II_YEAR: { ... },
  III_YEAR: { ... }
}
```

- Slot is parsed from strings like `(B Slot)` or `F slot`
- Faculty may be absent if the cell is empty
- Department/dept is optional in II/III Year for some courses

---

## Seed Script

**Command:**
```bash
npm run seed:ugallocation
```

**Options:**
- `--dry-run` — Parse only, output JSON to stdout without seeding the DB

**Prerequisites:**
1. Faculty seeded from Faculty Details: `npm run seed:faculty`
2. Prisma migrations applied: `npx prisma db push` (or `prisma migrate`)

**Flow:**
1. Read UG Allocation and Faculty Details sheets
2. Build faculty name → empId lookup from Faculty Details
3. Parse I Year, II Year, III Year blocks from UG Allocation
4. Upsert Course, Section, Faculty (for unknown faculty)
5. Create/update CourseOffering records
