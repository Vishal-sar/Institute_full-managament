import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, ShieldCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { ROLE_LABELS } from "@/lib/roles";

export default function Staff() {
  const lookups = useLookups();
  const [staff, setStaff] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/staff"); setStaff(data); } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Staff & Roles" description="Create and manage staff, faculty and admin accounts.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setEditing(null); setOpen(true); }} data-testid="add-staff-btn"><Plus className="mr-1.5 h-4 w-4" /> Add User</Button>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {staff === null ? <Loader /> : staff.length === 0 ? <EmptyState title="No staff accounts" icon={ShieldCheck} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="staff-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
              <TableBody>
                {staff.map((u) => (
                  <TableRow key={u.id} data-testid={`staff-row-${u.email}`}>
                    <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{ROLE_LABELS[u.role] || u.role}</span></TableCell>
                    <TableCell><span className={u.active ? "text-emerald-600" : "text-slate-400"}>{u.active ? "Active" : "Disabled"}</span></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }} data-testid={`edit-staff-${u.email}`}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {open && <StaffForm open={open} setOpen={setOpen} editing={editing} faculty={lookups.faculty} onDone={load} />}
    </div>
  );
}

function StaffForm({ open, setOpen, editing, faculty, onDone }) {
  const [form, setForm] = useState(editing
    ? { name: editing.name, email: editing.email, role: editing.role, phone: editing.phone || "", password: "", faculty_id: editing.linked_faculty_id || "", active: editing.active }
    : { name: "", email: "", role: "admin", phone: "", password: "", faculty_id: "", active: true });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!editing && !form.email.trim())) return toast.error("Name and email are required");
    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role, phone: form.phone, active: form.active, faculty_id: form.faculty_id || null };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/staff/${editing.id}`, payload);
        toast.success("Account updated");
      } else {
        await api.post("/admin/staff", { name: form.name, email: form.email, role: form.role, phone: form.phone, password: form.password || null, faculty_id: form.faculty_id || null, active: form.active });
        toast.success("Account created");
      }
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="staff-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="staff-name-input" /></div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={!!editing} data-testid="staff-email-input" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}><SelectTrigger data-testid="staff-role-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Faculty</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          {form.role === "teacher" && (
            <div className="space-y-1.5"><Label>Link to faculty profile</Label>
              <Select value={form.faculty_id} onValueChange={(v) => set("faculty_id", v)}><SelectTrigger data-testid="staff-faculty-select"><SelectValue placeholder="Select faculty profile" /></SelectTrigger><SelectContent>{faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>{editing ? "New password (optional)" : "Temporary password"}</Label><Input value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={editing ? "Leave blank to keep" : "ChangeMe@123"} data-testid="staff-password-input" /></div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><Label>Account active</Label><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} data-testid="staff-active-switch" /></div>
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="staff-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
