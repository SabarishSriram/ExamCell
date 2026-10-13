import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

function DropZone({ accept, multiple, fileLabel, files, onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFileList = (list) => {
    if (!list?.length) return;
    const next = multiple ? Array.from(list) : [list[0]];
    const invalid = next.find((f) => !/\.xlsx?$/i.test(f.name));
    if (invalid) {
      toast.error("Please upload an Excel file (.xlsx or .xls).");
      return;
    }
    onFiles(next);
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all
        ${dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : files.length
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-200 bg-slate-50 hover:border-primary/50 hover:bg-primary/[0.02]"
        } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFileList(e.dataTransfer.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileList(e.target.files)}
      />
      {files.length ? (
        <>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-center space-y-1">
            {files.map((f) => (
              <p key={f.name} className="text-sm font-semibold text-slate-800 max-w-[320px] truncate">
                {f.name}
              </p>
            ))}
            <p className="text-xs text-slate-400">
              {(files.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onFiles([]);
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Upload className="w-7 h-7 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Drop {fileLabel} here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse — .xlsx</p>
          </div>
        </>
      )}
    </div>
  );
}

const DataImportView = () => {
  const [stats, setStats] = useState(null);
  const [studentFiles, setStudentFiles] = useState([]);
  const [allocFile, setAllocFile] = useState([]);
  const [studentResult, setStudentResult] = useState(null);
  const [allocResult, setAllocResult] = useState(null);
  const [importingStudents, setImportingStudents] = useState(false);
  const [importingAlloc, setImportingAlloc] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get("/import/stats");
      setStats(res.data);
    } catch {
      toast.error("Failed to load current data counts");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const importStudents = async () => {
    if (!studentFiles.length) return;
    setImportingStudents(true);
    setStudentResult(null);
    try {
      const formData = new FormData();
      studentFiles.forEach((f) => formData.append("files", f));
      const res = await api.post("/import/students", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStudentResult(res.data);
      toast.success(`Imported ${res.data.insertedOrUpdated} students`);
      await fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to import students");
    } finally {
      setImportingStudents(false);
    }
  };

  const importAlloc = async () => {
    if (!allocFile.length) return;
    setImportingAlloc(true);
    setAllocResult(null);
    try {
      const formData = new FormData();
      formData.append("file", allocFile[0]);
      const res = await api.post("/import/course-alloc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAllocResult(res.data);
      toast.success("Course allocation imported");
      await fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to import course allocation");
    } finally {
      setImportingAlloc(false);
    }
  };

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
          Import data
        </h1>
        <p className="text-slate-500 font-medium tracking-tight">
          Upload semester Excel sheets to refresh students, faculty, and course allocations.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {[
            ["Students", stats.students],
            ["Faculty", stats.faculty],
            ["Courses", stats.courses],
            ["Sections", stats.sections],
            ["Offerings", stats.offerings],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student namelists</h2>
              <p className="text-xs text-slate-500">1st Year.xlsx, 2nd Year.xlsx, 3rd Year.xlsx</p>
            </div>
          </div>
          <DropZone
            accept=".xlsx,.xls"
            multiple
            fileLabel="student sheets"
            files={studentFiles}
            onFiles={(files) => {
              setStudentFiles(files);
              setStudentResult(null);
            }}
            disabled={importingStudents}
          />
          <p className="text-xs text-slate-400">
            Existing students are updated by register number. Sections are created if missing.
          </p>
          {studentResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800">
                  {studentResult.insertedOrUpdated} students upserted
                </span>
              </div>
              {(studentResult.files || []).map((f) => (
                <p key={f.name} className="text-xs text-slate-600">
                  {f.name}: {f.insertedOrUpdated} rows
                </p>
              ))}
            </div>
          )}
          <Button onClick={importStudents} disabled={!studentFiles.length || importingStudents} className="w-full h-11 rounded-xl">
            {importingStudents ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              "Import students"
            )}
          </Button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Course allocation</h2>
              <p className="text-xs text-slate-500">Course alloc-FA-25-26 EVEN.xlsx</p>
            </div>
          </div>
          <DropZone
            accept=".xlsx,.xls"
            fileLabel="the course allocation workbook"
            files={allocFile}
            onFiles={(files) => {
              setAllocFile(files);
              setAllocResult(null);
            }}
            disabled={importingAlloc}
          />
          <p className="text-xs text-slate-400">
            Imports faculty, courses, and faculty advisors. Existing course offerings are replaced.
            Keep <code>FA-25-26</code> in the filename so year suffixes stay correct.
          </p>
          {allocResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Imported {allocResult.file}</span>
              </div>
              <p className="text-xs text-slate-600">
                Faculty: {allocResult.faculty?.inserted} inserted, {allocResult.faculty?.updated} updated
              </p>
              <p className="text-xs text-slate-600">
                Courses: {allocResult.courses?.courses} · Offerings: {allocResult.courses?.offerings}
              </p>
              <p className="text-xs text-slate-600">
                Advisors linked: {allocResult.advisors?.linked ?? allocResult.advisors?.error}
              </p>
            </div>
          )}
          <Button onClick={importAlloc} disabled={!allocFile.length || importingAlloc} className="w-full h-11 rounded-xl">
            {importingAlloc ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              "Import course allocation"
            )}
          </Button>
        </section>
      </div>
    </main>
  );
};

export default DataImportView;
