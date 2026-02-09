import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  ClipboardList,
  AlertTriangle,
  UserX,
  Calendar as CalendarIcon,
  Download,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ReportsView = () => {
  const [reports, setReports] = useState([]);
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courseFaculty, setCourseFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | absent | malpractice
  const [filterDate, setFilterDate] = useState(null); // Date | null
  const [dateOpen, setDateOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [actionText, setActionText] = useState("");

  const handleDeleteReport = async (reportIdOrIds) => {
    const ids = Array.isArray(reportIdOrIds) ? reportIdOrIds : [reportIdOrIds];
    const message =
      ids.length === 1
        ? "Delete this report record?"
        : "Delete all report records for this subject?";

    toast(message, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await Promise.all(
              ids.map((id) =>
                axios.delete(`http://localhost:8000/api/reports/${id}`),
              ),
            );
            setReports((prev) => prev.filter((r) => !ids.includes(r.id)));
            toast.success(
              ids.length === 1
                ? "Report deleted successfully"
                : "Reports deleted successfully",
            );
          } catch (error) {
            console.error("Error deleting report:", error);
            toast.error("Failed to delete report");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
      duration: 5000,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, examsRes, coursesRes, facultyRes, courseFacultyRes] =
          await Promise.all([
            axios.get("http://localhost:8000/api/reports"),
            axios.get("http://localhost:8000/api/exams"),
            axios.get("http://localhost:8000/api/courses"),
            axios.get("http://localhost:8000/api/faculty"),
            axios.get("http://localhost:8000/api/course-faculty"),
          ]);
        setReports(reportsRes.data);
        setExams(examsRes.data);
        setCourses(coursesRes.data);
        setFaculty(facultyRes.data);
        // Flatten course-faculty data into an easy lookup list
        const raw = courseFacultyRes.data;
        const list = [];

        const pushRecord = (courseCode, courseName, section, facultyName) => {
          if (!courseCode || !section || !facultyName) return;
          list.push({ courseCode, courseName, section, facultyName });
        };

        const processYearBlock = (yearBlock) => {
          if (!yearBlock || typeof yearBlock !== "object") return;
          Object.values(yearBlock).forEach((course) => {
            if (!course || typeof course !== "object") return;
            const code = course.code;
            const name = course.name || "";

            if (Array.isArray(course.sections)) {
              course.sections.forEach((entry) => {
                pushRecord(code, name, entry.section, entry.faculty);
              });
            }

            if (Array.isArray(course.data)) {
              course.data.forEach((entry) => {
                pushRecord(code, name, entry.section, entry.faculty);
              });
            }
          });
        };

        processYearBlock(raw.I_YEAR);
        processYearBlock(raw.II_YEAR);
        processYearBlock(raw.III_YEAR);
        setCourseFaculty(list);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports/exams:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredReports = reports.filter((report) => {
    const linkedExam = exams.find((e) => e.id === report.examId);
    const courseName = linkedExam?.course || report.examName;

    const matchesCourse =
      selectedCourse === "all" || courseName === selectedCourse;
    if (!matchesCourse) return false;

    if (filterDate) {
      const examDateSource = linkedExam?.date || report.submittedAt;
      if (!examDateSource) return false;
      const examDate = new Date(examDateSource);
      if (!isSameDay(examDate, filterDate)) return false;
    }

    return true;
  });

  const malpracticeHistoryByReg = reports.reduce((acc, report) => {
    if (!Array.isArray(report.students)) return acc;
    report.students.forEach((s) => {
      if (s.activity && s.activity !== "None" && s.regNo) {
        acc[s.regNo] = (acc[s.regNo] || 0) + 1;
      }
    });
    return acc;
  }, {});

  // Flatten and group reported students by course so that
  // each subject appears once with all its reported students.
  const reportRows = filteredReports.flatMap((report) => {
    const linkedExam = exams.find((e) => e.id === report.examId);
    const examDateSource = linkedExam?.date || report.submittedAt;
    const examDate = examDateSource ? new Date(examDateSource) : null;
    const courseName = linkedExam?.course || report.examName;
    const courseInfo = courses.find((c) => c["Course Name"] === courseName);
    const courseCode = courseInfo?.["Course Code"] || "";
    const facultyInfo = faculty.find((f) => f.Section === report.section);
    const facultyName = facultyInfo?.["Faculty Name"] || "—";

    const courseFacultyEntry = courseFaculty.find(
      (cf) =>
        cf.section === report.section &&
        ((cf.courseCode && cf.courseCode === courseCode) ||
          (cf.courseName && cf.courseName === courseName)),
    );
    const courseFacultyName = courseFacultyEntry?.facultyName || "—";

    let studentsForReport = report.students.filter(
      (s) => !s.isPresent || s.activity !== "None" || s.remarks,
    );

    if (statusFilter === "absent") {
      studentsForReport = studentsForReport.filter((s) => !s.isPresent);
    } else if (statusFilter === "malpractice") {
      studentsForReport = studentsForReport.filter(
        (s) => s.activity && s.activity !== "None",
      );
    }

    return studentsForReport.map((s) => ({
      key: `${report.id}-${s.regNo}`,
      reportId: report.id,
      examName: report.examName,
      section: report.section,
      examDate,
      courseName,
      courseCode,
      facultyName,
      courseFacultyName,
      regNo: s.regNo,
      name: s.name,
      isPresent: s.isPresent,
      activity: s.activity,
      remarks: s.remarks,
      malpracticeCount: malpracticeHistoryByReg[s.regNo] || 0,
      actionTaken: s.actionTaken || "",
    }));
  });

  const groupedByCourse = reportRows.reduce((acc, row) => {
    const key = row.courseName || "Unknown";
    if (!acc[key]) {
      acc[key] = {
        courseName: row.courseName,
        courseCode: row.courseCode,
        rows: [],
      };
    }
    acc[key].rows.push(row);
    return acc;
  }, {});

  const groupedEntries = Object.values(groupedByCourse);

  const handleExportSheet = () => {
    if (reportRows.length === 0) {
      toast.error("No records to export");
      return;
    }

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const header = [
      "Exam Date",
      "Course Code",
      "Course Name",
      "Section",
      "Reg No",
      "Student Name",
      "FA Name",
      "Course Faculty",
      "Status",
      "Activity",
      "History of Malpractices",
      "Action Taken",
      "Remarks",
    ];

    const rows = reportRows.map((row) => {
      const examDateStr = row.examDate
        ? format(row.examDate, "dd/MM/yyyy")
        : "";
      const status = row.isPresent ? "PRESENT" : "ABSENT";

      return [
        examDateStr,
        row.courseCode,
        row.courseName,
        row.section,
        row.regNo,
        row.name,
        row.facultyName,
        row.courseFacultyName,
        status,
        row.activity,
        row.malpracticeCount,
        row.actionTaken || "",
        row.remarks || "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = [header.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "exam_reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveAction = async () => {
    if (!selectedRow) return;
    try {
      const reportId = selectedRow.reportId;
      const existing = reports.find((r) => r.id === reportId);
      if (!existing) {
        toast.error("Report not found for this record");
        return;
      }

      const updatedReport = {
        ...existing,
        students: existing.students.map((s) =>
          s.regNo === selectedRow.regNo ? { ...s, actionTaken: actionText } : s,
        ),
      };

      await axios.put(
        `http://localhost:8000/api/reports/${reportId}`,
        updatedReport,
      );

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? updatedReport : r)),
      );
      toast.success("Action taken updated successfully");
      setActionDialogOpen(false);
      setSelectedRow(null);
    } catch (error) {
      console.error("Error saving action taken:", error);
      toast.error("Failed to save action taken");
    }
  };

  if (loading)
    return <div className="p-20 text-center">Loading Reports...</div>;

  return (
    <div className="container mx-auto py-12 px-6 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
            Exam Session Reports
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">
            Access historical attendance and incident logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:items-center">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center justify-start h-10 w-full sm:w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600",
                  !filterDate && "text-slate-400",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {filterDate ? (
                  format(filterDate, "PPP")
                ) : (
                  <span>Select date</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={(d) => {
                  setFilterDate(d ?? null);
                  setDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl border-slate-200 bg-white font-semibold text-xs">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c["Course Code"]} value={c["Course Name"]}>
                  {c["Course Name"]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-slate-200 bg-white font-semibold text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="absent">Absentees Only</SelectItem>
              <SelectItem value="malpractice">Malpractices Only</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportSheet}
            disabled={reportRows.length === 0}
            className="h-10 px-4 rounded-xl border-slate-200 bg-white font-semibold text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export as Sheet
          </Button>
        </div>
      </div>

      {reportRows.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/60">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">No Reports Found</h3>
          <p className="text-slate-500 max-w-xs mx-auto font-medium">
            Try changing your filters or record a new session first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {groupedEntries.map((group) => {
            const absentees = group.rows.filter((s) => !s.isPresent);
            const malpractices = group.rows.filter(
              (s) => s.activity !== "None",
            );

            const reportIds = Array.from(
              new Set(group.rows.map((row) => row.reportId)),
            );

            return (
              <Card
                key={group.courseName}
                className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/10 bg-white group"
              >
                <CardHeader className="bg-slate-50/50 border-b p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-extrabold text-slate-800 group-hover:text-primary transition-colors">
                          {group.courseName}
                        </CardTitle>
                      </div>
                      <CardDescription className="font-bold flex items-center gap-2 text-slate-400">
                        Reported students for this subject
                      </CardDescription>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 shadow-sm">
                        <UserX className="w-4 h-4 text-rose-500" />
                        <span className="text-rose-700 font-bold text-sm tracking-tight">
                          {absentees.length} Absent
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700 font-bold text-sm tracking-tight">
                          {malpractices.length} Reported
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(reportIds)}
                        className="text-[10px] font-semibold text-red-500 hover:text-red-600 underline-offset-2 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
                    <Table className="min-w-[1080px] text-xs">
                      <TableHeader className="bg-slate-50/20">
                        <TableRow>
                          <TableHead className="w-[120px] font-bold text-slate-400 pl-6 uppercase text-[10px] tracking-widest">
                            Date
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Course Code
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Reg NO
                          </TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Student Name
                          </TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            FA Name
                          </TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Course Faculty
                          </TableHead>
                          <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">
                            Status
                          </TableHead>
                          <TableHead className="w-[260px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Activity Found
                          </TableHead>
                          <TableHead className="w-[80px] font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">
                            History of Malpractices
                          </TableHead>
                          <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pr-6">
                            Remarks
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">
                            Manage
                          </TableHead>
                          <TableHead className="w-[220px] font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                            Action Taken
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((s) => (
                          <TableRow
                            key={s.regNo}
                            className={
                              (s.activity !== "None" ? "bg-amber-50/10 " : "") +
                              "text-[11px]"
                            }
                          >
                            <TableCell className="font-mono text-xs font-bold text-slate-500 pl-6">
                              {s.examDate
                                ? format(s.examDate, "dd/MM/yyyy")
                                : "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-500">
                              {s.courseCode}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-500">
                              {s.regNo}
                            </TableCell>
                            <TableCell className="w-[160px] font-bold text-slate-800 tracking-tight">
                              {s.name}
                            </TableCell>
                            <TableCell className="w-[160px] text-xs text-slate-600 font-semibold">
                              {s.facultyName}
                            </TableCell>
                            <TableCell className="w-[160px] text-xs text-slate-600 font-semibold">
                              {s.courseFacultyName}
                            </TableCell>
                            <TableCell className="text-center">
                              {!s.isPresent ? (
                                <Badge
                                  variant="destructive"
                                  className="font-black bg-rose-500 shadow-lg shadow-rose-200"
                                >
                                  ABSENT
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black"
                                >
                                  PRESENT
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="w-[260px] whitespace-nowrap">
                              {s.activity !== "None" ? (
                                <Badge className="inline-flex items-center justify-center px-3 py-1 rounded-full border hover:bg-sky-50 border-sky-200 bg-sky-50 text-sky-700 font-semibold tracking-wide text-[10px]">
                                  {s.activity.toUpperCase()}
                                </Badge>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </TableCell>
                            <TableCell className="w-[80px] text-center text-[10px] text-slate-600 font-semibold">
                              {s.malpracticeCount}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 font-medium italic pr-6 max-w-[200px] truncate">
                              {s.remarks || (
                                <span className="text-slate-300">
                                  Clean Record
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="w-[110px] text-center text-xs text-slate-600">
                              {s.activity !== "None" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRow(s);
                                    setActionText(s.actionTaken || "");
                                    setActionDialogOpen(true);
                                  }}
                                  className="h-7 px-3 text-[10px] rounded-full border-primary/50 text-primary hover:bg-primary/10"
                                >
                                  {s.actionTaken ? "Edit" : "Manage"}
                                </Button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[220px] truncate">
                              {s.actionTaken ? (
                                s.actionTaken
                              ) : (
                                <span className="text-slate-300 text-[10px]">
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {absentees.length === 0 &&
                          malpractices.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="h-24 text-center text-slate-400 font-bold italic"
                              >
                                All students successfully passed proctoring
                                check.
                              </TableCell>
                            </TableRow>
                          )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialogOpen(false);
            setSelectedRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              Action for {selectedRow?.name} ({selectedRow?.regNo})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">History of malpractices:</span>{" "}
              <span className="font-bold">
                {selectedRow?.malpracticeCount ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Action Taken
              </p>
              <Input
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Enter action taken..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setSelectedRow(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAction}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsView;
