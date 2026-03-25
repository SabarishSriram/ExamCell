import React, { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import ExamCard from "./ExamCard";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const CalendarView = ({ exams }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState("month");
  const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
  const [selectedExam, setSelectedExam] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  let startDate = startOfWeek(monthStart);
  let endDate = endOfWeek(monthEnd);

  if (calendarMode === "week") {
    startDate = startOfWeek(currentDate);
    endDate = endOfWeek(currentDate);
  }

  const dateFormat = calendarMode === "month" ? "MMMM yyyy" : "MMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const next = () => {
    if (calendarMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const prev = () => {
    if (calendarMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedMobileDate(new Date());
  };

  // Helper to parse time string like "08:00 am - 09:40 am" for rough sorting
  const parseTimeForSort = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toLowerCase();
    
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* Calendar Header */}
      <div className="flex flex-col gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {format(currentDate, dateFormat)}
          </h2>
          <div className="flex bg-slate-200/50 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setCalendarMode("month")}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", calendarMode === "month" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}
            >Month</button>
            <button
              onClick={() => setCalendarMode("week")}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", calendarMode === "week" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}
            >Week</button>
          </div>
        </div>
        <div className="flex items-center justify-between w-full mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 w-20 md:h-10 md:w-24 rounded-lg border-slate-200 bg-white shadow-sm"
              onClick={prev}
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
            <Button
              variant="outline"
              className="h-10 w-20 md:h-10 md:w-24 rounded-lg border-slate-200 bg-white shadow-sm"
              onClick={next}
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="rounded-lg border-slate-200 font-bold text-sm h-12 md:h-8 px-6 shadow-sm"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-auto md:min-w-[700px] w-full">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[10px] md:text-xs font-black text-slate-400 tracking-wider uppercase truncate"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-slate-100">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            // Find exams for this day
            const dayExams = exams.filter((exam) => {
              if (!exam.date) return false;
              const examDate = new Date(exam.date);
              return isSameDay(examDate, day);
            });

            // Sort exams by time
            const sortedExams = dayExams.sort((a, b) => {
              return parseTimeForSort(a.time) - parseTimeForSort(b.time);
            });

            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedMobileDate(day)}
                className={cn(
                  "bg-white p-2 transition-colors relative group cursor-pointer border-r border-b border-slate-100/50",
                  calendarMode === "month" ? "min-h-[60px] md:min-h-[160px] lg:min-h-[180px]" : "min-h-[80px] md:min-h-[300px]",
                  !isCurrentMonth && calendarMode === "month" && "bg-slate-50/50 text-slate-400",
                  "hover:bg-slate-50",
                  isSameDay(day, selectedMobileDate) && "md:bg-white bg-slate-100"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-2 mx-auto md:mx-0",
                    isToday
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : isSameDay(day, selectedMobileDate)
                      ? "bg-slate-800 text-white md:bg-transparent md:text-inherit"
                      : isCurrentMonth || calendarMode === "week"
                      ? "text-slate-700"
                      : "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </div>

                {/* Mobile indicators */}
                {sortedExams.length > 0 && (
                  <div className="md:hidden flex justify-center gap-1 mt-1 mb-1 absolute bottom-1 left-0 right-0">
                    {sortedExams.slice(0, 3).map((e, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                    ))}
                    {sortedExams.length > 3 && <div className="w-1 h-1 rounded-full bg-primary/50" />}
                  </div>
                )}

                <div className="hidden md:block space-y-1.5 absolute inset-x-2 top-10 bottom-2 overflow-y-auto pr-1 no-scrollbar">
                  {sortedExams.map((exam) => (
                    <div
                      key={exam.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); }}
                      className="group/item flex flex-col gap-1 rounded-md border border-primary/10 bg-primary/5 px-2 py-1.5 text-xs hover:border-primary/30 hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
                      title={`${exam.course} - ${exam.time}`}
                    >
                      <div className="font-bold text-primary truncate leading-tight">
                        {exam.course}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-medium text-[10px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{exam.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden flex-1 overflow-auto bg-slate-50/50 p-4 space-y-4">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">
          {isSameDay(selectedMobileDate, new Date()) ? "Today, " : ""}{format(selectedMobileDate, "d MMMM yyyy")}
        </h3>
        {exams.filter(e => e.date && isSameDay(new Date(e.date), selectedMobileDate)).length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8 font-medium">No exams scheduled for this date.</div>
        ) : (
          exams.filter(e => e.date && isSameDay(new Date(e.date), selectedMobileDate))
            .sort((a, b) => parseTimeForSort(a.time) - parseTimeForSort(b.time))
            .map(exam => (
              <div 
                key={exam.id} 
                className="bg-white rounded-xl p-4 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedExam(exam)}
              >
                 <div className="font-bold text-slate-800 text-sm mb-1">{exam.course}</div>
                 <div className="flex flex-col text-xs text-slate-500 gap-1.5 font-medium">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.time}</span>
                    {(!exam.venueBySection || Object.keys(exam.venueBySection).length === 0) && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {exam.venue || "TBD"}</span>
                    )}
                 </div>
              </div>
          ))
        )}
      </div>

      <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-md [&>button]:hidden sm:rounded-2xl">
          <DialogTitle className="sr-only">Exam Details</DialogTitle>
          {selectedExam && (
            <div className="bg-white rounded-xl shadow-xl overflow-hidden ring-1 ring-slate-200/50">
              <ExamCard exam={selectedExam} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
