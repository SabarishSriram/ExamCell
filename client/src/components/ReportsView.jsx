import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ClipboardList, AlertTriangle, UserX, Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const ReportsView = () => {
  const [reports, setReports] = useState([]);
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedExamId, setSelectedExamId] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, examsRes, sectionsRes] = await Promise.all([
          axios.get('http://localhost:8000/api/reports'),
          axios.get('http://localhost:8000/api/exams'),
          axios.get('http://localhost:8000/api/sections')
        ]);
        setReports(reportsRes.data);
        setExams(examsRes.data);
        setSections(sectionsRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports/exams:", error);
      }
    };
    fetchData();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesExam = selectedExamId === 'all' || report.examId === selectedExamId;
    const matchesSection = selectedSection === 'all' || report.section === selectedSection;
    return matchesExam && matchesSection;
  });

  if (loading) return <div className="p-20 text-center">Loading Reports...</div>;

  return (
    <div className="container mx-auto py-12 px-6 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
            Exam Session Reports
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Access historical attendance and incident logs.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-xl border-slate-200 bg-white font-semibold">
              <SelectValue placeholder="Filter by Exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.course}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-full sm:w-[160px] h-12 rounded-xl border-slate-200 bg-white font-semibold">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => (
                <SelectItem key={s} value={s}>Section {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/60">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">No Reports Found</h3>
          <p className="text-slate-500 max-w-xs mx-auto font-medium">Try changing your filters or record a new session first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {filteredReports.map((report) => {
            const absentees = report.students.filter(s => !s.isPresent);
            const malpractices = report.students.filter(s => s.activity !== 'None');

            return (
              <Card key={report.id} className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/10 bg-white group">
                <CardHeader className="bg-slate-50/50 border-b p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-extrabold text-slate-800 group-hover:text-primary transition-colors">{report.examName}</CardTitle>
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">Section {report.section}</Badge>
                      </div>
                      <CardDescription className="font-bold flex items-center gap-2 text-slate-400">
                        Recorded on: {format(new Date(report.submittedAt), "PPP p")}
                      </CardDescription>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 shadow-sm">
                        <UserX className="w-4 h-4 text-rose-500" />
                        <span className="text-rose-700 font-bold text-sm tracking-tight">{absentees.length} Absent</span>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700 font-bold text-sm tracking-tight">{malpractices.length} Reported</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/20">
                      <TableRow>
                        <TableHead className="w-[150px] font-bold text-slate-400 pl-6 uppercase text-[10px] tracking-widest">Reg NO</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Student Information</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Activity Found</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pr-6">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.students.filter(s => !s.isPresent || s.activity !== 'None' || s.remarks).map((s) => (
                        <TableRow key={s.regNo} className={s.activity !== 'None' ? 'bg-amber-50/10' : ''}>
                          <TableCell className="font-mono text-xs font-bold text-slate-500 pl-6">{s.regNo}</TableCell>
                          <TableCell className="font-bold text-slate-800 tracking-tight">{s.name}</TableCell>
                          <TableCell className="text-center">
                            {!s.isPresent ? (
                              <Badge variant="destructive" className="font-black bg-rose-500 shadow-lg shadow-rose-200">ABSENT</Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black">PRESENT</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.activity !== 'None' ? (
                              <Badge className="bg-amber-400 text-white border-none font-black shadow-lg shadow-amber-200">
                                {s.activity.toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium italic pr-6 max-w-[200px] truncate">
                            {s.remarks || <span className="text-slate-300">Clean Record</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {absentees.length === 0 && malpractices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-slate-400 font-bold italic">
                            All students successfully passed proctoring check.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsView;
