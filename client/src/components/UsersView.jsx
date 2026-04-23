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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const ROLE_COLORS = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  scheduler: "bg-blue-50 text-blue-700 border-blue-200",
  squad: "bg-green-50 text-green-700 border-green-200",
};

const emptyForm = { email: "", password: "", role: "scheduler" };

const UsersView = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // user object being edited
  const [deleteUser, setDeleteUser] = useState(null); // user object to confirm delete

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ role: "", password: "" });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.role) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success(`User ${form.email} created`);
      setAddOpen(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.role && !editForm.password) {
      toast.error("Provide a new role or password");
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      if (editForm.role) payload.role = editForm.role;
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/users/${editUser.id}`, payload);
      toast.success(`User ${editUser.email} updated`);
      setEditUser(null);
      setEditForm({ role: "", password: "" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      toast.success(`User ${deleteUser.email} deleted`);
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
            Users
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">
            Manage accounts and roles for ExamCell portal access.
          </p>
        </div>
        <Button
          onClick={() => { setForm(emptyForm); setAddOpen(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          <span className="font-semibold text-sm">Add User</span>
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No users yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/20">
              <TableRow>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Email</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Role</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Created</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors text-[11px]">
                  <TableCell className="font-medium text-slate-800 pl-6">
                    {u.email}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">(you)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-bold ${ROLE_COLORS[u.role] || ""}`}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(new Date(u.createdAt), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditUser(u); setEditForm({ role: u.role, password: "" }); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="user@srmist.edu.in"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Password</label>
              <Input
                type="password"
                placeholder="Set a password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Role</label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduler">Scheduler — manage exams + reports</SelectItem>
                  <SelectItem value="squad">Squad — create & update reports only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="rounded-xl">
              {saving ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-500 font-medium">{editUser.email}</p>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Role</label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="squad">Squad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  New Password <span className="text-slate-300 font-normal normal-case">(leave blank to keep current)</span>
                </label>
                <Input
                  type="password"
                  placeholder="New password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="rounded-xl">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm py-2">
            Are you sure you want to delete <span className="font-bold">{deleteUser?.email}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} className="rounded-xl">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-xl"
            >
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default UsersView;
