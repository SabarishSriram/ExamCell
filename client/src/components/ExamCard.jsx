import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ExamCard = ({ exam }) => {
  return (
    <Card className="group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border-slate-200/60 overflow-hidden bg-white/50 backdrop-blur-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3 pt-6 px-6">
        <div className="flex justify-between items-start mb-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold px-3 py-1">
            {exam.year}
          </Badge>
          <div className="flex -space-x-2">
            {exam.sections.map((s, idx) => (
              <div 
                key={s} 
                className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm"
                style={{ zIndex: 10 - idx }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
        <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors">
          {exam.course}
        </CardTitle>
        <CardDescription className="font-medium text-slate-400">Scheduled Examination</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            {format(new Date(exam.date), "EEEE, d MMM yyyy")}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            {exam.time}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            {exam.venue}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Select Section to Record Session</p>
          <div className="flex flex-wrap gap-2">
            {exam.sections.map(section => (
              <Link
                key={section}
                to={`/session/${exam.id}/${section}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary hover:text-white transition-all duration-200 text-sm font-bold bg-white shadow-sm hover:shadow-md hover:shadow-primary/20 decoration-transparent"
              >
                <Users className="w-4 h-4" />
                Section {section}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamCard;
