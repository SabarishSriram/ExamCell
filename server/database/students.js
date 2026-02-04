const faculty = require("./faculty");

// Build 10 mock students for each section present in faculty.js
const sections = [...new Set(faculty.map((f) => f.Section))];

// Some Indian first and last names for more realistic mock data
const firstNames = [
  "Aarav",
  "Vihaan",
  "Aditya",
  "Ishaan",
  "Pranav",
  "Sanjana",
  "Ananya",
  "Diya",
  "Karthik",
  "Shruti",
  "Rahul",
  "Neha",
  "Rohan",
  "Priya",
  "Arjun",
  "Sneha",
];

const lastNames = [
  "Sharma",
  "Verma",
  "Reddy",
  "Iyer",
  "Patel",
  "Nair",
  "Gupta",
  "Rao",
  "Menon",
  "Das",
  "Singh",
  "Chandra",
];

const students = [];

// Base numeric part for roll numbers like RA2311032010000
const baseRollNumber = 2311032010000;

sections.forEach((section, sectionIndex) => {
  for (let i = 1; i <= 10; i++) {
    const globalIndex = sectionIndex * 10 + i;

    // Roll number increments globally starting from RA2311032010000
    const rollNumber = baseRollNumber + globalIndex - 1;
    const regNo = `RA${rollNumber}`;

    const firstName = firstNames[(globalIndex - 1) % firstNames.length];
    const lastName = lastNames[(globalIndex - 1) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    const phone = `900000${String(globalIndex).padStart(4, "0")}`;

    students.push({
      RegNO: regNo,
      Name: name,
      Semester: "II",
      Section: section,
      Specialization: "CSE",
      "Phone number": phone,
      "Email address": `student${globalIndex}@example.com`,
    });
  }
});

module.exports = students;
