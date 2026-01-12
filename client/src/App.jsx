import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AddExamModal from './components/AddExamModal';
import ExamCard from './components/ExamCard';
import ExamSession from './components/ExamSession';
import ReportsView from './components/ReportsView';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { Users, GraduationCap } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = ({ exams, courses, sections, searchTerm, setSearchTerm, filterSection, setFilterSection, onAddExam }) => {
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = filterSection === 'all' || exam.sections.includes(filterSection);
    return matchesSearch && matchesSection;
  });

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-12 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              Exam Dashboard
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">Manage and monitor institutional examination schedules across all sections.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative group w-full sm:w-[320px]">
              <Input 
                placeholder="Search course name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 transition-all bg-white shadow-sm font-medium"
              />
              <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
            
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-xl border-slate-200 bg-white font-bold text-slate-600 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <SelectValue placeholder="All Sections" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/60 shadow-inner">
          <div className="bg-slate-100/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Exams Scheduled</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">Get started by creating your first examination schedule for this semester.</p>
          <Button onClick={onAddExam} variant="outline" className="rounded-xl border-2 hover:bg-slate-50 font-bold px-8">
            + Create First Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredExams.map(exam => (
            <ExamCard key={exam.id} exam={exam} />
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('all');

  const fetchData = async () => {
    try {
      const [examsRes, coursesRes, sectionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/exams`),
        axios.get(`${API_BASE_URL}/courses`),
        axios.get(`${API_BASE_URL}/sections`)
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

  return (
    <Router>
      <div className="min-h-screen bg-slate-50/30">
        <Navbar onAddExam={() => setIsAddModalOpen(true)} />
        
        <Routes>
          <Route path="/" element={
            <Dashboard 
              exams={exams} 
              courses={courses} 
              sections={sections}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterSection={filterSection}
              setFilterSection={setFilterSection}
              onAddExam={() => setIsAddModalOpen(true)}
            />
          } />
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
