const fs = require("fs");
const path = require("path");

const EXAMS_FILE = path.join(__dirname, "database", "exams_data.json");
const REPORTS_FILE = path.join(__dirname, "database", "reports_data.json");

// Initialize files if they don't exist
if (!fs.existsSync(EXAMS_FILE))
  fs.writeFileSync(EXAMS_FILE, JSON.stringify([]));
if (!fs.existsSync(REPORTS_FILE))
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));

const readData = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeData = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

const express = require("express");
const cors = require("cors");
const students = require("./database/students");
const faculty = require("./database/faculty");
const courses = require("./database/courses");
const courseFaculty = require("./database/courseFaculty");

const app = express();
const port = 8000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Helper to map student to their faculty based on section
const getStudentData = () => {
  return students.map((student) => {
    const assignedFaculty = faculty.find((f) => f.Section === student.Section);
    return {
      ...student,
      Faculty: assignedFaculty || null,
      Courses: courses,
    };
  });
};

app.get("/api/students", (req, res) => {
  res.json(getStudentData());
});

app.get("/api/sections", (req, res) => {
  const sections = [...new Set(students.map((s) => s.Section))];
  res.json(sections);
});

app.get("/api/courses", (req, res) => {
  res.json(courses);
});

app.get("/api/course-faculty", (req, res) => {
  res.json(courseFaculty);
});

app.get("/api/exams", (req, res) => {
  res.json(readData(EXAMS_FILE));
});

app.post("/api/exams", (req, res) => {
  const exams = readData(EXAMS_FILE);
  const newExam = {
    id: Date.now().toString(),
    ...req.body,
  };
  exams.push(newExam);
  writeData(EXAMS_FILE, exams);
  res.status(201).json(newExam);
});

app.put("/api/exams/:id", (req, res) => {
  const exams = readData(EXAMS_FILE);
  const index = exams.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Exam not found" });
  }
  const updatedExam = {
    ...exams[index],
    ...req.body,
    id: exams[index].id,
  };
  exams[index] = updatedExam;
  writeData(EXAMS_FILE, exams);
  res.json(updatedExam);
});

app.delete("/api/exams/:id", (req, res) => {
  const exams = readData(EXAMS_FILE);
  const reports = readData(REPORTS_FILE);
  const examId = req.params.id;

  const updatedExams = exams.filter((e) => e.id !== examId);
  const updatedReports = reports.filter((r) => r.examId !== examId);

  writeData(EXAMS_FILE, updatedExams);
  writeData(REPORTS_FILE, updatedReports);

  res.status(204).end();
});

app.get("/api/reports", (req, res) => {
  res.json(readData(REPORTS_FILE));
});

app.post("/api/reports", (req, res) => {
  const reports = readData(REPORTS_FILE);
  const newReport = {
    id: Date.now().toString(),
    ...req.body,
    submittedAt: new Date().toISOString(),
  };
  reports.push(newReport);
  writeData(REPORTS_FILE, reports);
  res.status(201).json(newReport);
});

app.put("/api/reports/:id", (req, res) => {
  const reports = readData(REPORTS_FILE);
  const index = reports.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Report not found" });
  }

  const existing = reports[index];
  const updatedReport = {
    ...existing,
    ...req.body,
    id: existing.id,
    submittedAt: existing.submittedAt,
  };

  reports[index] = updatedReport;
  writeData(REPORTS_FILE, reports);
  res.json(updatedReport);
});

app.delete("/api/reports/:id", (req, res) => {
  const reports = readData(REPORTS_FILE);
  const reportId = req.params.id;
  const updatedReports = reports.filter((r) => r.id !== reportId);
  writeData(REPORTS_FILE, updatedReports);
  res.status(204).end();
});

app.get("/api/faculty", (req, res) => {
  res.json(faculty);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
