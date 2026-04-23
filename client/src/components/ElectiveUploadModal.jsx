import React, { useState, useRef } from "react";
import { api } from "@/lib/api";
import { Upload, FileText, X, Loader2, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

/**
 * ElectiveUploadModal
 * Lets the user upload an SRM elective namelist PDF.
 * On success it calls onParsed({ year, sections, course, venue })
 * so the parent can pre-fill the Add Exam form.
 */
const ElectiveUploadModal = ({ isOpen, onClose, onParsed }) => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    setDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await api.post("/parse-elective-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success("PDF parsed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse PDF. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    onParsed(result);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Import Elective Namelist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all
              ${dragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : file
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-primary/50 hover:bg-primary/[0.02]"
              }`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {file ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800 max-w-[280px] truncate">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
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
                  <p className="text-sm font-semibold text-slate-700">Drop your PDF here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse &mdash; SRM student namelist format</p>
                </div>
              </>
            )}
          </div>

          {/* Parsed result preview */}
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-800">Extracted successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium uppercase tracking-wide text-[10px]">Year</p>
                  <p className="font-semibold text-slate-800">{result.year || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium uppercase tracking-wide text-[10px]">Venue</p>
                  <p className="font-semibold text-slate-800">{result.venue || "—"}</p>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <p className="text-slate-500 font-medium uppercase tracking-wide text-[10px]">Course</p>
                  <p className="font-semibold text-slate-800">
                    {result.course
                      ? result.courseCode
                        ? `${result.course} (${result.courseCode})`
                        : result.course
                      : "—"}
                  </p>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <p className="text-slate-500 font-medium uppercase tracking-wide text-[10px]">Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.sections || []).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                These will be pre-filled in the exam form. You can adjust before submitting.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            {result ? (
              <Button onClick={handleConfirm} className="flex-1">
                Use This Data
              </Button>
            ) : (
              <Button
                onClick={handleParse}
                disabled={!file || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing…
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ElectiveUploadModal;
