require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const prisma = require("./prisma/prismaClient");

// Multer — memory storage so we parse the buffer directly (no disk writes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
const port = 8000;

const JWT_SECRET =
  process.env.JWT_SECRET || "examcell-secret-key-change-in-production";

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

// ─── Auth Middleware ──────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Always fetch fresh role from DB so role changes take effect immediately
    // and so old tokens (without role in payload) still work correctly
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// ─── Audit Logging ───────────────────────────────────────────────────────────

async function logAction(userId, userEmail, action, details) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        details: details
          ? typeof details === "string"
            ? details
            : JSON.stringify(details)
          : null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ user });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Users (admin only) ──────────────────────────────────────────────────────

app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password, and role are required" });
    }
    if (!["scheduler", "squad"].includes(role)) {
      return res.status(400).json({ message: "Invalid role — only scheduler or squad can be assigned" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    await logAction(req.user.userId, req.user.email, "create_user", { email, role });
    res.status(201).json(user);
  } catch (err) {
    console.error("POST /api/users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, password } = req.body;

    if (role && !["admin", "scheduler", "squad"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const data = {};
    if (role) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const changes = {};
    if (role && role !== existing.role) changes.role = { from: existing.role, to: role };
    if (password) changes.passwordChanged = true;
    await logAction(req.user.userId, req.user.email, "update_user", { email: existing.email, changes });

    res.json(user);
  } catch (err) {
    console.error("PUT /api/users/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: "User not found" });
    await prisma.auditLog.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    await logAction(req.user.userId, req.user.email, "delete_user", { email: user.email, role: user.role });
    res.status(204).end();
  } catch (err) {
    console.error("DELETE /api/users/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Audit Logs (admin only) ─────────────────────────────────────────────────

app.get("/api/logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json(logs);
  } catch (err) {
    console.error("GET /api/logs error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Students ────────────────────────────────────────────────────────────────

app.get("/api/students", requireAuth, async (req, res) => {
  try {
    const { section } = req.query;
    const students = await prisma.student.findMany({
      where: section ? { sectionCode: section } : undefined,
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

app.get("/api/sections", requireAuth, async (req, res) => {
  try {
    const sections = await prisma.section.findMany({ select: { code: true } });
    res.json(sections.map((s) => s.code));
  } catch (err) {
    console.error("GET /api/sections error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Courses ─────────────────────────────────────────────────────────────────

app.get("/api/courses", requireAuth, async (req, res) => {
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

app.get("/api/course-faculty", requireAuth, async (req, res) => {
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

app.get("/api/faculty", requireAuth, async (req, res) => {
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
    electiveRegNos: exam.electiveRegNos ? JSON.parse(exam.electiveRegNos) : null,
    bookletType: exam.bookletType || null,
  };
}

app.get("/api/exams", requireAuth, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({ include: { sections: true } });
    res.json(exams.map(formatExam));
  } catch (err) {
    console.error("GET /api/exams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/exams", requireAuth, requireRole("admin", "scheduler"), async (req, res) => {
  try {
    const {
      course,
      date,
      time,
      from,
      to,
      year,
      sections,
      venueBySection,
      venue,
      electiveRegNos,
      bookletType,
    } = req.body;
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
        electiveRegNos: electiveRegNos ? JSON.stringify(electiveRegNos) : null,
        bookletType: bookletType || null,
        sections: {
          create: (sections || []).map((sec) => ({
            sectionCode: sec,
            venue: venueBySection?.[sec] || null,
          })),
        },
      },
      include: { sections: true },
    });

    let bookletsUsed = 0;
    if (bookletType && (sections || []).length > 0) {
      bookletsUsed = await prisma.student.count({
        where: { sectionCode: { in: sections } },
      });
      if (bookletsUsed > 0) {
        await prisma.bookletStock.upsert({
          where: { type: bookletType },
          update: { quantity: { decrement: bookletsUsed } },
          create: { type: bookletType, quantity: -bookletsUsed },
        });
      }
    }

    await logAction(req.user.userId, req.user.email, "create_exam", {
      examId: exam.id,
      course,
      date,
      time,
      year: year || "",
      sections: sections || [],
      venueBySection: venueBySection || {},
      electiveCount: electiveRegNos ? electiveRegNos.length : null,
      bookletType: bookletType || null,
      bookletsUsed: bookletsUsed || null,
    });
    res.status(201).json(formatExam(exam));
  } catch (err) {
    console.error("POST /api/exams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/exams/:id", requireAuth, requireRole("admin", "scheduler"), async (req, res) => {
  try {
    const {
      course,
      date,
      time,
      from,
      to,
      year,
      sections,
      venueBySection,
      venue,
    } = req.body;

    const existing = await prisma.exam.findUnique({
      where: { id: req.params.id },
    });
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

    await logAction(req.user.userId, req.user.email, "update_exam", {
      examId: exam.id,
      course: exam.name,
      date: exam.date.toISOString(),
      time: exam.timeRange,
      year: exam.year || "",
      sections: sections || [],
      venueBySection: venueBySection || {},
    });
    res.json(formatExam(exam));
  } catch (err) {
    console.error("PUT /api/exams/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/exams/:id", requireAuth, requireRole("admin", "scheduler"), async (req, res) => {
  try {
    const examId = req.params.id;
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    await prisma.reportStudentIncident.deleteMany({
      where: { report: { examId } },
    });
    await prisma.examReport.deleteMany({ where: { examId } });
    await prisma.examSection.deleteMany({ where: { examId } });
    await prisma.exam.delete({ where: { id: examId } });
    await logAction(req.user.userId, req.user.email, "delete_exam", {
      examId,
      course: exam?.name || examId,
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "Exam not found" });
    console.error("DELETE /api/exams/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Section Student Counts ──────────────────────────────────────────────────

app.get("/api/section-counts", requireAuth, async (req, res) => {
  try {
    const counts = await prisma.student.groupBy({
      by: ["sectionCode"],
      _count: { regNo: true },
    });
    const result = {};
    for (const c of counts) {
      result[c.sectionCode] = c._count.regNo;
    }
    res.json(result);
  } catch (err) {
    console.error("GET /api/section-counts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Inventory ───────────────────────────────────────────────────────────────

const BOOKLET_TYPES = ["40-page", "15-page"];

app.get("/api/inventory", requireAuth, async (req, res) => {
  try {
    const stock = await Promise.all(
      BOOKLET_TYPES.map((type) =>
        prisma.bookletStock.upsert({
          where: { type },
          update: {},
          create: { type, quantity: 0 },
        })
      )
    );
    res.json(stock);
  } catch (err) {
    console.error("GET /api/inventory error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/inventory/add-stock", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { type, quantity } = req.body;
    if (!BOOKLET_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid booklet type" });
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive number" });
    }
    const updated = await prisma.bookletStock.upsert({
      where: { type },
      update: { quantity: { increment: qty } },
      create: { type, quantity: qty },
    });
    await logAction(req.user.userId, req.user.email, "add_stock", { type, quantity: qty, newTotal: updated.quantity });
    res.json(updated);
  } catch (err) {
    console.error("POST /api/inventory/add-stock error:", err);
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

app.get("/api/reports", requireAuth, async (req, res) => {
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

app.post("/api/reports", requireAuth, requireRole("admin", "scheduler", "squad"), async (req, res) => {
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

    await logAction(req.user.userId, req.user.email, "submit_report", {
      reportId: report.id,
      examId,
      examName,
      section,
      students: (students || []).map((s) => ({
        regNo: s.regNo || "",
        name: s.name,
        isPresent: s.isPresent ?? true,
        activity: s.activity || "None",
        remarks: s.remarks || "",
      })),
    });

    res.status(201).json(formatReport(report));
  } catch (err) {
    console.error("POST /api/reports error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/reports/:id", requireAuth, requireRole("admin", "scheduler", "squad"), async (req, res) => {
  try {
    const existing = await prisma.examReport.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ message: "Report not found" });

    const { students } = req.body;

    const oldStudentRecords = await prisma.reportStudentIncident.findMany({
      where: { reportId: req.params.id },
    });

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

    const newStudents = students || [];
    const oldMap = new Map(oldStudentRecords.map((s) => [s.regNo || s.name, s]));
    const newlyAbsent = [], nowPresent = [], incidentAdded = [], incidentRemoved = [], incidentChanged = [];
    for (const newS of newStudents) {
      const key = newS.regNo || newS.name;
      const oldS = oldMap.get(key);
      if (!oldS) continue;
      const wasPresent = oldS.isPresent;
      const isPresent = newS.isPresent ?? true;
      if (wasPresent && !isPresent) newlyAbsent.push({ regNo: newS.regNo || "", name: newS.name, remarks: newS.remarks || "" });
      else if (!wasPresent && isPresent) nowPresent.push({ regNo: newS.regNo || "", name: newS.name });
      const oldHasIncident = oldS.activity && oldS.activity !== "None";
      const newHasIncident = newS.activity && newS.activity !== "None";
      if (!oldHasIncident && newHasIncident) {
        incidentAdded.push({ regNo: newS.regNo || "", name: newS.name, activity: newS.activity, remarks: newS.remarks || "" });
      } else if (oldHasIncident && !newHasIncident) {
        incidentRemoved.push({ regNo: newS.regNo || "", name: newS.name, activity: oldS.activity });
      } else if (oldHasIncident && newHasIncident) {
        if (oldS.activity !== newS.activity || oldS.remarks !== (newS.remarks || null) || oldS.actionTaken !== (newS.actionTaken || null)) {
          incidentChanged.push({
            regNo: newS.regNo || "", name: newS.name,
            from: { activity: oldS.activity, remarks: oldS.remarks || "", actionTaken: oldS.actionTaken || "" },
            to: { activity: newS.activity, remarks: newS.remarks || "", actionTaken: newS.actionTaken || "" },
          });
        }
      }
    }

    await logAction(req.user.userId, req.user.email, "update_report", {
      reportId: req.params.id,
      examId: existing.examId,
      examName: existing.examName,
      section: existing.sectionCode,
      before: {
        present: oldStudentRecords.filter((s) => s.isPresent).length,
        absent: oldStudentRecords.filter((s) => !s.isPresent).length,
        incidents: oldStudentRecords.filter((s) => s.activity && s.activity !== "None").length,
      },
      after: {
        present: newStudents.filter((s) => s.isPresent ?? true).length,
        absent: newStudents.filter((s) => !(s.isPresent ?? true)).length,
        incidents: newStudents.filter((s) => s.activity && s.activity !== "None").length,
      },
      changes: { newlyAbsent, nowPresent, incidentAdded, incidentRemoved, incidentChanged },
    });
    res.json(formatReport(report));
  } catch (err) {
    console.error("PUT /api/reports/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/reports/:id", requireAuth, requireRole("admin", "scheduler"), async (req, res) => {
  try {
    const report = await prisma.examReport.findUnique({ where: { id: req.params.id } });
    await prisma.reportStudentIncident.deleteMany({
      where: { reportId: req.params.id },
    });
    await prisma.examReport.delete({ where: { id: req.params.id } });
    await logAction(req.user.userId, req.user.email, "delete_report", {
      reportId: req.params.id,
      examName: report?.examName,
      section: report?.sectionCode,
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "Report not found" });
    console.error("DELETE /api/reports/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Elective PDF Parsing ────────────────────────────────────────────────────

/**
 * POST /api/parse-elective-pdf
 * Accepts a multipart/form-data PDF upload (field name: "pdf").
 * Parses the SRM namelist PDF and returns:
 *   { year, sections, course, venue }
 */
app.post("/api/parse-elective-pdf", requireAuth, requireRole("admin", "scheduler"), upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    // Dynamic ESM import — pdfjs-dist ships as ESM only
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(req.file.buffer) }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }

    // ── Extract course code and name ──────────────────────────────────────────
    // e.g. "21CSE368J(Network Programming for IoT) handled by ..."
    const courseMatch = text.match(/(\d+[A-Z]+\d+[A-Z]*)\(([^)]+)\)/);
    const courseCode = courseMatch ? courseMatch[1].trim() : "";
    const course = courseMatch ? courseMatch[2].trim() : "";

    // ── Extract venue ─────────────────────────────────────────────────────────
    // e.g. "Venue : LH906 (Block: TECH PARK II)"
    const venueMatch = text.match(/Venue\s*:\s*([^\(\n]+)/);
    const venue = venueMatch ? venueMatch[1].trim() : "";

    // ── Extract section codes from the Section column ─────────────────────────
    // Rows contain "CS IOT   Y2" or "CS IOT   Z2" etc.
    const sectionMatches = [...text.matchAll(/CS\s+IOT\s+([A-Z]\d)/g)].map((m) => m[1]);
    const sections = [...new Set(sectionMatches)].sort();

    // ── Extract all student reg numbers ───────────────────────────────────────
    // e.g. RA2311032010001, RA2411031010001, etc.
    const regNoMatches = [...text.matchAll(/\b(RA\d{13})\b/g)].map((m) => m[1]);
    const electiveRegNos = [...new Set(regNoMatches)];

    // ── Derive year from the Registration Numbers ───────────────────────────
    // RA25 -> 1st Year, RA24 -> 2nd Year, RA23 -> 3rd Year
    let year = "";
    if (electiveRegNos.length > 0) {
      const prefixYears = electiveRegNos.map(r => r.substring(2, 4));
      const counts = prefixYears.reduce((acc, y) => { acc[y] = (acc[y] || 0) + 1; return acc; }, {});
      const majorityYear = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

      const REVERSE_YEAR_MAP = {
        "25": "1st Year",
        "24": "2nd Year",
        "23": "3rd Year"
      };
      year = REVERSE_YEAR_MAP[majorityYear] || "";
    }

    res.json({ year, sections, course, courseCode, venue, electiveRegNos });
  } catch (err) {
    console.error("POST /api/parse-elective-pdf error:", err);
    res.status(500).json({ message: "Failed to parse PDF" });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
