import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, formatDate } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const empty = { name: "", code: "", course_id: "", teacher_id: "", start_date: "", end_date: "", days: [], start_time: "", end_time: "", timezone: "Asia/Kolkata", mode: "classroom", location: "", capacity: 30, status: "active" };

export default function Batches() {
  const lookups = useLookups();
  const [batches, setBatches] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/batches"); setBatches(data); } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Batches" description="Schedule batches, assign teachers and track capacity.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setEditing(null); setOpen(true); }} data-testid="add-batch-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Batch</Button>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {batches === null ? <Loader /> : batches.length === 0 ? <EmptyState title="No batches yet" icon={Boxes} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="batches-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Batch</TableHead><TableHead>Course</TableHead><TableHead>Teacher</TableHead><TableHead>Schedule</TableHead><TableHead>Seats</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id} data-testid={`batch-row-${b.code}`}>
                    <TableCell><p className="font-medium text-slate-900">{b.name}</p><p className="text-xs text-slate-400">{b.code} · {b.mode}</p></TableCell>
                    <TableCell className="text-slate-600">{b.course_title}</TableCell>
                    <TableCell className="text-slate-600">{b.teacher_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{(b.days || []).map((d) => d.slice(0, 3)).join(", ")}<br />{b.start_time}–{b.end_time}</TableCell>
                    <TableCell><span className={cn(b.enrolled_count >= b.capacity ? "text-rose-600" : "text-slate-700")}>{b.enrolled_count}/{b.capacity}</span></TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(b); setOpen(true); }} data-testid={`edit-batch-${b.code}`}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {open && <BatchForm open={open} setOpen={setOpen} editing={editing} lookups={lookups} onDone={load} />}
    </div>
  );
}

function BatchForm({ open, setOpen, editing, lookups, onDone }) {
  const [form, setForm] = useState(editing ? { ...empty, ...editing, days: editing.days || [] } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDay = (d) => set("days", form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.course_id) return toast.error("Name and course are required");
    setSaving(true);
    const payload = { ...form, teacher_id: form.teacher_id || null, capacity: Number(form.capacity) || 0, start_date: form.start_date || null, end_date: form.end_date || null };
    try {
      if (editing) await api.put(`/admin/batches/${editing.id}`, payload);
      else await api.post("/admin/batches", payload);
      toast.success(editing ? "Batch updated" : "Batch created");
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" data-testid="batch-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit batch" : "New batch"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Batch name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="batch-name-input" /></div>
            <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Course *</Label>
              <Select value={form.course_id} onValueChange={(v) => set("course_id", v)}><SelectTrigger data-testid="batch-course-select"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Teacher</Label>
              <Select value={form.teacher_id || ""} onValueChange={(v) => set("teacher_id", v)}><SelectTrigger data-testid="batch-teacher-select"><SelectValue placeholder="Assign teacher" /></SelectTrigger><SelectContent>{lookups.faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={form.start_date || ""} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={form.end_date || ""} onChange={(e) => set("end_date", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Days of week</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => <button type="button" key={d} onClick={() => toggleDay(d)} className={cn("rounded-full border px-3 py-1 text-xs", form.days.includes(d) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600")}>{d.slice(0, 3)}</button>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="classroom">Classroom</SelectItem><SelectItem value="online">Online</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} data-testid="batch-capacity-input" /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Location / meeting link</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="batch-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Batch"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
