import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollText, Search, MapPin, Clock, Users, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ACTION_LABELS = {
  create_exam:   { label: "Create Exam",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  update_exam:   { label: "Update Exam",   color: "bg-sky-50 text-sky-700 border-sky-200" },
  delete_exam:   { label: "Delete Exam",   color: "bg-red-50 text-red-700 border-red-200" },
  submit_report: { label: "Submit Report", color: "bg-green-50 text-green-700 border-green-200" },
  update_report: { label: "Update Report", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  delete_report: { label: "Delete Report", color: "bg-orange-50 text-orange-700 border-orange-200" },
  create_user:   { label: "Create User",   color: "bg-purple-50 text-purple-700 border-purple-200" },
  update_user:   { label: "Update User",   color: "bg-violet-50 text-violet-700 border-violet-200" },
  delete_user:   { label: "Delete User",   color: "bg-rose-50 text-rose-700 border-rose-200" },
  add_stock:     { label: "Add Stock",     color: "bg-teal-50 text-teal-700 border-teal-200" },
};

function parseDetails(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

// ─── Detail renderers per action type ────────────────────────────────────────

function ExamDetail({ d, action }) {
  const isDelete = action === "delete_exam";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</p>
        <p className="text-lg font-bold text-slate-800">{d.course}</p>
        {d.year && <p className="text-xs text-slate-500 font-medium mt-0.5">{d.year}</p>}
      </div>
      {!isDelete && (
        <>
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date</p>
              <p className="text-sm font-semibold text-slate-700">
                {d.date ? format(new Date(d.date), "EEEE, d MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time</p>
              <p className="text-sm font-semibold text-slate-700">{d.time || "—"}</p>
            </div>
          </div>

          {d.sections && d.sections.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sections & Venues</p>
              <div className="space-y-1.5">
                {d.sections.map((sec) => (
                  <div key={sec} className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-slate-700 min-w-[3.5rem] whitespace-nowrap">{sec}</span>
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600 font-medium">
                      {d.venueBySection?.[sec] || <span className="text-slate-300 italic">No venue</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.electiveCount != null && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Elective Students</p>
              <p className="text-sm font-semibold text-slate-700">{d.electiveCount} students</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportDetail({ d }) {
  if (!d) return null;
  const students = d.students || [];
  const absent = students.filter((s) => !s.isPresent);
  const incidents = students.filter((s) => s.activity && s.activity !== "None");
  const present = students.filter((s) => s.isPresent);

  return (
    <div className="space-y-5">
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</p>
          <p className="text-base font-bold text-slate-800">{d.examName}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Section</p>
          <p className="text-base font-bold text-slate-800">{d.section}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-700">{present.length} Present</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl">
          <UserX className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-700">{absent.length} Absent</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-700">{incidents.length} Incidents</span>
        </div>
      </div>

      {absent.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Absentees</p>
          <div className="space-y-1">
            {absent.map((s) => (
              <div key={s.regNo || s.name} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0">{s.regNo || "—"}</span>
                <span className="font-semibold text-slate-700">{s.name}</span>
                {s.remarks && <span className="text-slate-400 text-xs italic ml-auto">{s.remarks}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {incidents.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Incidents</p>
          <div className="space-y-1">
            {incidents.map((s) => (
              <div key={s.regNo || s.name} className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0 pt-0.5">{s.regNo || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700">{s.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold border">
                      {s.activity}
                    </Badge>
                    {s.remarks && <span className="text-xs text-slate-500 italic">{s.remarks}</span>}
                    {s.actionTaken && (
                      <span className="text-xs text-slate-600 font-medium">→ {s.actionTaken}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length > 0 && absent.length === 0 && incidents.length === 0 && (
        <p className="text-sm text-slate-400 italic">All {students.length} students present, no incidents.</p>
      )}
    </div>
  );
}

function UserDetail({ d, action }) {
  if (!d) return null;
  const ROLE_COLORS = {
    admin: "bg-purple-100 text-purple-700 border-purple-200",
    scheduler: "bg-blue-100 text-blue-700 border-blue-200",
    squad: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</p>
        <p className="text-base font-bold text-slate-800">{d.email}</p>
      </div>
      {action === "create_user" && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role assigned</p>
          <Badge className={`text-xs font-bold border ${ROLE_COLORS[d.role] || ""}`}>{d.role}</Badge>
        </div>
      )}
      {action === "delete_user" && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role at deletion</p>
          <Badge className={`text-xs font-bold border ${ROLE_COLORS[d.role] || ""}`}>{d.role}</Badge>
        </div>
      )}
      {action === "update_user" && d.changes && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Changes</p>
          {d.changes.role && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium">Role:</span>
              <Badge className={`text-xs font-bold border ${ROLE_COLORS[d.changes.role.from] || ""}`}>{d.changes.role.from}</Badge>
              <span className="text-slate-400">→</span>
              <Badge className={`text-xs font-bold border ${ROLE_COLORS[d.changes.role.to] || ""}`}>{d.changes.role.to}</Badge>
            </div>
          )}
          {d.changes.passwordChanged && (
            <p className="text-sm text-slate-600 font-medium mt-2">Password was changed</p>
          )}
          {!d.changes.role && !d.changes.passwordChanged && (
            <p className="text-sm text-slate-400 italic">No changes recorded</p>
          )}
        </div>
      )}
    </div>
  );
}

function UpdateReportDetail({ d }) {
  if (!d) return null;
  const { changes, before, after } = d;

  if (!changes) return <ReportDetail d={d} />;

  const hasChanges =
    changes.newlyAbsent?.length > 0 ||
    changes.nowPresent?.length > 0 ||
    changes.incidentAdded?.length > 0 ||
    changes.incidentRemoved?.length > 0 ||
    changes.incidentChanged?.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</p>
          <p className="text-base font-bold text-slate-800">{d.examName}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Section</p>
          <p className="text-base font-bold text-slate-800">{d.section}</p>
        </div>
      </div>

      {before && after && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Changes</p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Before</span>
              <span className="font-bold text-emerald-700">{before.present}P</span>
              <span className="font-bold text-red-700">{before.absent}A</span>
              <span className="font-bold text-amber-700">{before.incidents}I</span>
            </div>
            <span className="text-slate-400 text-sm">→</span>
            <div className="flex gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">After</span>
              <span className="font-bold text-emerald-700">{after.present}P</span>
              <span className="font-bold text-red-700">{after.absent}A</span>
              <span className="font-bold text-amber-700">{after.incidents}I</span>
            </div>
          </div>
        </div>
      )}

      {!hasChanges && (
        <p className="text-sm text-slate-400 italic">No attendance or incident changes detected.</p>
      )}

      {changes.newlyAbsent?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Marked Absent</p>
          <div className="space-y-1">
            {changes.newlyAbsent.map((s) => (
              <div key={s.regNo || s.name} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0">{s.regNo || "—"}</span>
                <span className="font-semibold text-red-700">{s.name}</span>
                {s.remarks && <span className="text-slate-400 text-xs italic ml-auto">{s.remarks}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.nowPresent?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Marked Present</p>
          <div className="space-y-1">
            {changes.nowPresent.map((s) => (
              <div key={s.regNo || s.name} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0">{s.regNo || "—"}</span>
                <span className="font-semibold text-emerald-700">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.incidentAdded?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Incidents Added</p>
          <div className="space-y-1">
            {changes.incidentAdded.map((s) => (
              <div key={s.regNo || s.name} className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0 pt-0.5">{s.regNo || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700">{s.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold border">{s.activity}</Badge>
                    {s.remarks && <span className="text-xs text-slate-500 italic">{s.remarks}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.incidentRemoved?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Incidents Removed</p>
          <div className="space-y-1">
            {changes.incidentRemoved.map((s) => (
              <div key={s.regNo || s.name} className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0 pt-0.5">{s.regNo || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700">{s.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge className="bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold border line-through">{s.activity}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.incidentChanged?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Incidents Updated</p>
          <div className="space-y-2">
            {changes.incidentChanged.map((s) => (
              <div key={s.regNo || s.name} className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs text-slate-400 w-36 shrink-0 pt-0.5">{s.regNo || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700">{s.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 line-through">{s.from.activity}</span>
                    <span className="text-slate-300">→</span>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold border">{s.to.activity}</Badge>
                  </div>
                  {s.from.remarks !== s.to.remarks && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="line-through">{s.from.remarks || "—"}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="italic">{s.to.remarks || "—"}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteReportDetail({ d }) {
  if (!d) return null;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</p>
        <p className="text-base font-bold text-slate-800">{d.examName || "—"}</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Section</p>
        <p className="text-base font-bold text-slate-800">{d.section || "—"}</p>
      </div>
    </div>
  );
}

function AddStockDetail({ d }) {
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Booklet Type</p>
        <p className="text-base font-bold text-slate-800">{d.type}</p>
      </div>
      <div className="flex gap-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Added</p>
          <p className="text-2xl font-extrabold text-teal-600">+{d.quantity}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">New Total</p>
          <p className="text-2xl font-extrabold text-slate-800">{d.newTotal?.toLocaleString() ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

function LogDetailContent({ log }) {
  const d = parseDetails(log.details);

  if (log.action === "add_stock") {
    return typeof d === "object" && d ? <AddStockDetail d={d} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  if (["create_exam", "update_exam", "delete_exam"].includes(log.action)) {
    return typeof d === "object" && d ? <ExamDetail d={d} action={log.action} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  if (log.action === "submit_report") {
    return typeof d === "object" && d ? <ReportDetail d={d} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  if (log.action === "update_report") {
    return typeof d === "object" && d ? <UpdateReportDetail d={d} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  if (log.action === "delete_report") {
    return typeof d === "object" && d ? <DeleteReportDetail d={d} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  if (["create_user", "update_user", "delete_user"].includes(log.action)) {
    return typeof d === "object" && d ? <UserDetail d={d} action={log.action} /> : <p className="text-sm text-slate-500">{String(d)}</p>;
  }
  return <p className="text-sm text-slate-500">{d ? String(d) : "No details available."}</p>;
}

// ─── Main component ───────────────────────────────────────────────────────────

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

const LogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    api
      .get("/logs")
      .then((res) => setLogs(res.data))
      .catch(() => toast.error("Failed to load logs"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    const matchesEmail =
      !searchEmail || log.userEmail.toLowerCase().includes(searchEmail.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesEmail && matchesAction;
  });

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
          Audit Logs
        </h1>
        <p className="text-slate-500 font-medium tracking-tight">
          Track all actions performed in the ExamCell portal. Click any row for full details.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by email…"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-slate-200 font-bold text-slate-600 text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Actions</SelectItem>
            {ALL_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a]?.label || a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No logs found</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/20">
              <TableRow>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Time</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">User</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Action</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const meta = ACTION_LABELS[log.action];
                const d = parseDetails(log.details);
                let summary = "—";
                if (typeof d === "object" && d) {
                  if (d.course) summary = d.course;
                  else if (d.examName) summary = `${d.examName} · ${d.section}`;
                  else if (d.email) summary = d.email;
                  else if (log.action === "add_stock" && d.type) summary = `+${d.quantity} × ${d.type} booklets`;
                } else if (typeof d === "string") {
                  summary = d;
                }
                return (
                  <TableRow
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer text-[11px]"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-slate-500 whitespace-nowrap pl-6">
                      {format(new Date(log.createdAt), "d MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {log.userEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-bold ${meta?.color || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {meta?.label || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {summary}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 font-medium mt-4">
          Showing {filtered.length} of {logs.length} log entries (latest 500)
        </p>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle asChild>
              <div className="flex flex-col gap-2">
                {selectedLog && (
                  <>
                    <Badge variant="outline" className={`self-start text-xs font-bold ${ACTION_LABELS[selectedLog.action]?.color || ""}`}>
                      {ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}
                    </Badge>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 font-medium text-sm">{selectedLog.userEmail}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 font-normal text-sm">
                        {format(new Date(selectedLog.createdAt), "d MMM yyyy, HH:mm:ss")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {selectedLog && <LogDetailContent log={selectedLog} />}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default LogsView;
