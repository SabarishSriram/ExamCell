import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

const ExamSession = () => {
  const { examId, sectionId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [activities, setActivities] = useState({});
  const [remarks, setRemarks] = useState({});
  const [reportId, setReportId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, studentRes, reportRes] = await Promise.all([
          api.get("/exams"),
          api.get("/students"),
          api.get("/reports"),
        ]);

        const currentExam = examRes.data.find((e) => e.id === examId);
        setExam(currentExam);

        const sectionStudents = studentRes.data.filter(
          (s) => s.Section === sectionId,
        );
        setStudents(sectionStudents);

        const existingReport = reportRes.data.find(
          (r) => r.examId === examId && r.section === sectionId
        );

        if (existingReport) {
          setReportId(existingReport.id);
        }

        // Initialize state
        const initialAttendance = {};
        const initialActivities = {};
        const initialRemarks = {};

        if (existingReport) {
          existingReport.students.forEach((s) => {
            initialAttendance[s.regNo] = s.isPresent;
            initialActivities[s.regNo] = s.activity;
            initialRemarks[s.regNo] = s.remarks;
          });
        }

        sectionStudents.forEach((s) => {
          if (initialAttendance[s.RegNO] === undefined) {
             initialAttendance[s.RegNO] = true; // Default ticked (Present)
             initialActivities[s.RegNO] = "None";
             initialRemarks[s.RegNO] = "";
          }
        });

        setAttendance(initialAttendance);
        setActivities(initialActivities);
        setRemarks(initialRemarks);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };
    fetchData();
  }, [examId, sectionId]);

  const handleSubmit = async () => {
    const reportData = {
      examId,
      examName: exam.course,
      section: sectionId,
      students: students.map((s) => ({
        regNo: s.RegNO,
        name: s.Name,
        isPresent: attendance[s.RegNO],
        activity: activities[s.RegNO],
        remarks: remarks[s.RegNO],
      })),
    };

    try {
      if (reportId) {
        await api.put(`/reports/${reportId}`, reportData);
        toast.success("Report updated successfully!");
      } else {
        await api.post("/reports", reportData);
        toast.success("Report submitted successfully!");
      }
      navigate("/");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4">
        <div className="text-sm font-medium text-slate-600">
          Loading Session...
        </div>
      </div>
    );

  const currentVenue = exam?.venueBySection?.[sectionId] || exam?.venue || "";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-auto sm:h-20 py-3 sm:py-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {exam?.course}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20"
                >
                  Section {sectionId}
                </Badge>
                <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                  {exam?.year}
                </span>
                {currentVenue && (
                  <span className="text-xs text-slate-500 font-medium">
                    Venue: {currentVenue}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            className="gap-2 bg-primary shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" />
            {reportId ? "Update Reports" : "Submit Reports"}
          </Button>
        </div>
      </div>

      <main className="container mx-auto py-6 px-4 sm:px-6">
        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Recording Attendance & Malpractice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[720px] text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-50/30">
                    <TableHead className="w-[80px] text-center">
                      Present
                    </TableHead>
                    <TableHead className="w-[150px]">Reg NO</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[200px]">
                      Activity / Incident
                    </TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.RegNO}
                      className={
                        !attendance[student.RegNO] ? "bg-red-50/30" : ""
                      }
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={attendance[student.RegNO]}
                          onCheckedChange={(val) => {
                            const isPresent = val === true;
                            setAttendance((prev) => ({
                              ...prev,
                              [student.RegNO]: isPresent,
                            }));
                            if (!isPresent) {
                              setActivities((prev) => ({
                                ...prev,
                                [student.RegNO]: "None",
                              }));
                            }
                          }}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-500">
                        {student.RegNO}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">
                          {student.Name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {student.Specialization}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={activities[student.RegNO]}
                          onValueChange={(val) =>
                            setActivities((prev) => ({
                              ...prev,
                              [student.RegNO]: val,
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-9 text-xs font-semibold bg-white"
                            disabled={!attendance[student.RegNO]}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None (Clear)</SelectItem>
                            <SelectItem value="Bit Material">
                              Bit Material
                            </SelectItem>
                            <SelectItem value="Mobile Phone">
                              Mobile Phone
                            </SelectItem>
                            <SelectItem value="Late Arrival">
                              Late Arrival
                            </SelectItem>
                            <SelectItem value="Dress Code">
                              Dress Code
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Additional details..."
                          value={remarks[student.RegNO]}
                          disabled={!attendance[student.RegNO]}
                          onChange={(e) =>
                            setRemarks((prev) => ({
                              ...prev,
                              [student.RegNO]: e.target.value,
                            }))
                          }
                          className="h-9 text-xs bg-white border-slate-200"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ExamSession;
