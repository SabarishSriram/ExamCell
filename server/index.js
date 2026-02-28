const express = require("express");
const cors = require("cors");
const prisma = require("./prisma/prismaClient");

const app = express();
const port = 8000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// ─── Students ────────────────────────────────────────────────────────────────

app.get("/api/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        section: { include: { advisor: true } },
      },
    });
    res.json(
      students.map((s) => ({
        RegNO: s.regNo,
        Name: s.name,
        Section: s.sectionCode,
        Specialization: s.specialization || "",
        Phone: s.phone || "",
        Email: s.email || "",
        Faculty: s.section?.advisor
          ? { Section: s.sectionCode, "Faculty Name": s.section.advisor.name }
          : null,
      })),
    );
  } catch (err) {
    console.error("GET /api/students error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Sections ────────────────────────────────────────────────────────────────

app.get("/api/sections", async (req, res) => {
  try {
    const sections = await prisma.section.findMany({ select: { code: true } });
    res.json(sections.map((s) => s.code));
  } catch (err) {
    console.error("GET /api/sections error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Courses ─────────────────────────────────────────────────────────────────

app.get("/api/courses", async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(
      courses.map((c) => ({
        "Course Code": c.code,
        "Course Name": c.name,
        Type: c.type || "Core",
        Year: c.year || "",
      })),
    );
  } catch (err) {
    console.error("GET /api/courses error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Course–Faculty (allocation) ─────────────────────────────────────────────

const YEAR_LABEL_TO_KEY = {
  "1st Year": "I_YEAR",
  "2nd Year": "II_YEAR",
  "3rd Year": "III_YEAR",
};

app.get("/api/course-faculty", async (req, res) => {
  try {
    const offerings = await prisma.courseOffering.findMany({
      include: { course: true, faculty: true },
    });

    const result = { I_YEAR: {}, II_YEAR: {}, III_YEAR: {} };

    for (const o of offerings) {
      const yearKey = YEAR_LABEL_TO_KEY[o.yearLabel] || "I_YEAR";
      if (!result[yearKey][o.courseCode]) {
        result[yearKey][o.courseCode] = {
          code: o.courseCode,
          name: o.course.name,
          slot: o.slot,
          data: [],
        };
      }
      result[yearKey][o.courseCode].data.push({
        section: o.sectionCode,
        faculty: o.faculty?.name || undefined,
      });
    }

    res.json(result);
  } catch (err) {
    console.error("GET /api/course-faculty error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Faculty (section advisors) ──────────────────────────────────────────────

app.get("/api/faculty", async (req, res) => {
  try {
    const sections = await prisma.section.findMany({
      where: { advisorEmpId: { not: null } },
      include: { advisor: true },
    });
    res.json(
      sections.map((s) => ({
        Section: s.code,
        "Faculty Name": s.advisor?.name || "",
      })),
    );
  } catch (err) {
    console.error("GET /api/faculty error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Exams ───────────────────────────────────────────────────────────────────

function formatExam(exam) {
  const sections = exam.sections.map((es) => es.sectionCode);
  const venueBySection = {};
  for (const es of exam.sections) {
    venueBySection[es.sectionCode] = es.venue || "";
  }
  return {
    id: exam.id,
    course: exam.name,
    date: exam.date.toISOString(),
    time: exam.timeRange,
    from: exam.fromTime,
    to: exam.toTime,
    year: exam.year || "",
    sections,
    venueBySection,
    venue: exam.venue || "",
  };
}

app.get("/api/exams", async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({ include: { sections: true } });
    res.json(exams.map(formatExam));
  } catch (err) {
    console.error("GET /api/exams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/exams", async (req, res) => {
  try {
    const { course, date, time, from, to, year, sections, venueBySection, venue } = req.body;
    const id = Date.now().toString();

    const exam = await prisma.exam.create({
      data: {
        id,
        name: course,
        date: new Date(date),
        fromTime: from,
        toTime: to,
        timeRange: time,
        year: year || null,
        venue: venue || null,
        sections: {
          create: (sections || []).map((sec) => ({
            sectionCode: sec,
            venue: venueBySection?.[sec] || null,
          })),
        },
      },
      include: { sections: true },
    });

    res.status(201).json(formatExam(exam));
  } catch (err) {
    console.error("POST /api/exams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/exams/:id", async (req, res) => {
  try {
    const { course, date, time, from, to, year, sections, venueBySection, venue } = req.body;

    const existing = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Exam not found" });

    await prisma.examSection.deleteMany({ where: { examId: req.params.id } });

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        name: course ?? existing.name,
        date: date ? new Date(date) : existing.date,
        fromTime: from ?? existing.fromTime,
        toTime: to ?? existing.toTime,
        timeRange: time ?? existing.timeRange,
        year: year !== undefined ? year : existing.year,
        venue: venue !== undefined ? venue : existing.venue,
        sections: {
          create: (sections || []).map((sec) => ({
            sectionCode: sec,
            venue: venueBySection?.[sec] || null,
          })),
        },
      },
      include: { sections: true },
    });

    res.json(formatExam(exam));
  } catch (err) {
    console.error("PUT /api/exams/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/exams/:id", async (req, res) => {
  try {
    const examId = req.params.id;
    await prisma.reportStudentIncident.deleteMany({
      where: { report: { examId } },
    });
    await prisma.examReport.deleteMany({ where: { examId } });
    await prisma.examSection.deleteMany({ where: { examId } });
    await prisma.exam.delete({ where: { id: examId } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Exam not found" });
    console.error("DELETE /api/exams/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Reports ─────────────────────────────────────────────────────────────────

function formatReport(report) {
  return {
    id: report.id,
    examId: report.examId,
    examName: report.examName,
    section: report.sectionCode,
    submittedAt: report.submittedAt.toISOString(),
    students: report.students.map((s) => ({
      regNo: s.regNo || s.studentRegNo || "",
      name: s.name,
      isPresent: s.isPresent,
      activity: s.activity || "None",
      remarks: s.remarks || "",
      actionTaken: s.actionTaken || "",
    })),
  };
}

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await prisma.examReport.findMany({
      include: { students: true },
    });
    res.json(reports.map(formatReport));
  } catch (err) {
    console.error("GET /api/reports error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const { examId, examName, section, students } = req.body;
    const id = Date.now().toString();

    const regNos = (students || []).map((s) => s.regNo).filter(Boolean);
    const existing = await prisma.student.findMany({
      where: { regNo: { in: regNos } },
      select: { regNo: true },
    });
    const validRegNos = new Set(existing.map((s) => s.regNo));

    const report = await prisma.examReport.create({
      data: {
        id,
        examId,
        examName,
        sectionCode: section,
        submittedAt: new Date(),
        students: {
          create: (students || []).map((s) => ({
            regNo: s.regNo || null,
            studentRegNo: s.regNo && validRegNos.has(s.regNo) ? s.regNo : null,
            name: s.name,
            isPresent: s.isPresent ?? true,
            activity: s.activity || null,
            remarks: s.remarks || null,
          })),
        },
      },
      include: { students: true },
    });

    res.status(201).json(formatReport(report));
  } catch (err) {
    console.error("POST /api/reports error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/reports/:id", async (req, res) => {
  try {
    const existing = await prisma.examReport.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ message: "Report not found" });

    const { students } = req.body;

    const regNos = (students || []).map((s) => s.regNo).filter(Boolean);
    const existingStudents = await prisma.student.findMany({
      where: { regNo: { in: regNos } },
      select: { regNo: true },
    });
    const validRegNos = new Set(existingStudents.map((s) => s.regNo));

    await prisma.reportStudentIncident.deleteMany({
      where: { reportId: req.params.id },
    });

    const report = await prisma.examReport.update({
      where: { id: req.params.id },
      data: {
        students: {
          create: (students || []).map((s) => ({
            regNo: s.regNo || null,
            studentRegNo: s.regNo && validRegNos.has(s.regNo) ? s.regNo : null,
            name: s.name,
            isPresent: s.isPresent ?? true,
            activity: s.activity || null,
            remarks: s.remarks || null,
            actionTaken: s.actionTaken || null,
          })),
        },
      },
      include: { students: true },
    });

    res.json(formatReport(report));
  } catch (err) {
    console.error("PUT /api/reports/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/reports/:id", async (req, res) => {
  try {
    await prisma.reportStudentIncident.deleteMany({
      where: { reportId: req.params.id },
    });
    await prisma.examReport.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Report not found" });
    console.error("DELETE /api/reports/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
