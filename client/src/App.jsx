import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import Navbar from "./components/Navbar";
import AddExamModal from "./components/AddExamModal";
import ExamCard from "./components/ExamCard";
import ExamSession from "./components/ExamSession";
import ReportsView from "./components/ReportsView";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Button } from "./components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Calendar } from "./components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, MapPin, GraduationCap } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

const Dashboard = ({
  exams,
  courses,
  filterDate,
  setFilterDate,
  selectedCourse,
  setSelectedCourse,
  venueFilter,
  setVenueFilter,
  onAddExam,
  onDeleteExam,
}) => {
  const filteredExams = exams.filter((exam) => {
    const examDate = exam.date ? new Date(exam.date) : null;
    const matchesDate =
      !filterDate || (examDate && isSameDay(examDate, filterDate));

    const matchesCourse =
      selectedCourse === "all" || exam.course === selectedCourse;

    const baseVenue = (exam.venue || "").toLowerCase();
    const sectionVenues = exam.venueBySection
      ? Object.values(exam.venueBySection).join(" ").toLowerCase()
      : "";
    const combinedVenues = `${baseVenue} ${sectionVenues}`.trim();
    const matchesVenue =
      !venueFilter || combinedVenues.includes(venueFilter.toLowerCase());

    return matchesDate && matchesCourse && matchesVenue;
  });

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-12 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              Exam Dashboard
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">
              Manage and monitor institutional examination schedules across all
              sections.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] h-12 justify-start text-left font-medium rounded-xl border-slate-200 bg-white shadow-sm text-xs",
                    !filterDate && "text-slate-400",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {filterDate ? (
                    format(filterDate, "PPP")
                  ) : (
                    <span>Select date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={(date) => setFilterDate(date ?? null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-xl border-slate-200 bg-white font-bold text-slate-600 shadow-sm text-xs">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 max-h-64">
                <SelectItem value="all">All Subjects</SelectItem>
                {courses.map((course) => (
                  <SelectItem
                    key={course["Course Code"]}
                    value={course["Course Name"]}
                  >
                    {course["Course Name"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative group w-full sm:w-[220px]">
              <Input
                placeholder="Filter by venue..."
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 transition-all bg-white shadow-sm font-medium text-sm"
              />
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/60 shadow-inner">
          <div className="bg-slate-100/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            No Exams Scheduled
          </h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">
            Get started by creating your first examination schedule for this
            semester.
          </p>
          <Button
            onClick={onAddExam}
            variant="outline"
            className="rounded-xl border-2 hover:bg-slate-50 font-bold px-8"
          >
            + Create First Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onDelete={() => onDeleteExam(exam.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
};

function App() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [venueFilter, setVenueFilter] = useState("");

  const fetchData = async () => {
    try {
      const [examsRes, coursesRes, sectionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/exams`),
        axios.get(`${API_BASE_URL}/courses`),
        axios.get(`${API_BASE_URL}/sections`),
      ]);
      setExams(examsRes.data);
      setCourses(coursesRes.data);
      setSections(sectionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteExam = async (examId) => {
    const confirmed = window.confirm("Delete this exam and its records?");
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/exams/${examId}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting exam:", error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50/30">
        <Navbar onAddExam={() => setIsAddModalOpen(true)} />

        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                exams={exams}
                courses={courses}
                filterDate={filterDate}
                setFilterDate={setFilterDate}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                venueFilter={venueFilter}
                setVenueFilter={setVenueFilter}
                onAddExam={() => setIsAddModalOpen(true)}
                onDeleteExam={handleDeleteExam}
              />
            }
          />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/session/:examId/:sectionId" element={<ExamSession />} />
        </Routes>

        <AddExamModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchData}
          courses={courses}
          sections={sections}
        />
      </div>
    </Router>
  );
}

export default App;
