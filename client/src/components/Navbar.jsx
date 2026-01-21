import React from "react";
import { Button } from "./ui/button";
import {
  Plus,
  GraduationCap,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = ({ onAddExam }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            to="/"
            className="flex items-center gap-3 decoration-transparent"
          >
            {/* <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20"> */}
              {/* <GraduationCap className="w-7 h-7 text-primary" /> */}
              <img
                src="https://scet.berkeley.edu/wp-content/uploads/8.-SRM-Logo.png"
                alt=""
                className="w-10 h-10"
              />
            {/* </div> */}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                ExamCell
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
                Institutional Portal
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive("/")
                  ? "bg-primary/5 text-primary"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Exams
            </Link>
            <Link
              to="/reports"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive("/reports")
                  ? "bg-primary/5 text-primary"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={onAddExam}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] h-11 px-6 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-sm">Create Exam</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
