import React from "react";
import { Button } from "./ui/button";
import { Plus, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ onAddExam }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-10">
          <Link
            to="/"
            className="flex items-center gap-3 decoration-transparent"
          >
            <img
              src="https://www.qdcsrmist.in/images/nwc.png"
              alt="SRM Logo"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                ExamCell
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
                Institutional Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              title="Exams"
              className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive("/")
                  ? "bg-primary/5 text-primary"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Exams</span>
            </Link>
            <Link
              to="/reports"
              title="Reports"
              className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive("/reports")
                  ? "bg-primary/5 text-primary"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Reports</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              sessionStorage.removeItem("token");
              window.location.href = "/login";
            }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
          <Button
            onClick={onAddExam}
            title="Create Exam"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] h-11 px-3 md:px-6 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-xs md:text-sm">Create Exam</span>
          </Button>

          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="hidden sm:block text-xs font-semibold text-slate-500 max-w-[160px] truncate">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
