import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, formatCurrency } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { cn } from "@/lib/utils";

const empty = { title: "", category: "General", level: "Beginner", duration: "", fee_amount: 0, currency: "INR", description: "", image_url: "", status: "published", admission_open: true, prerequisites: "", curriculum: [], outcomes: [], faculty_ids: [], faqs: [] };

export default function CoursesAdmin() {
  const [courses, setCourses] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/courses"); setCourses(data); } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); api.get("/admin/faculty").then((r) => setFaculty(r.data)).catch(() => {}); }, [load]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="Create, edit, publish or archive your programs.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={openNew} data-testid="add-course-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Course</Button>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {courses === null ? <Loader /> : courses.length === 0 ? <EmptyState title="No courses yet" icon={BookOpen} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="courses-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead><TableHead>Fee</TableHead><TableHead>Enrolled</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id} data-testid={`course-row-${c.slug}`}>
                    <TableCell className="font-medium text-slate-900">{c.title}</TableCell>
                    <TableCell className="text-slate-600">{c.category}</TableCell>
                    <TableCell className="text-slate-600">{c.level}</TableCell>
                    <TableCell>{formatCurrency(c.fee_amount, c.currency)}</TableCell>
                    <TableCell>{c.enrolled_count}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => openEdit(c)} data-testid={`edit-course-${c.slug}`}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {open && <CourseForm open={open} setOpen={setOpen} editing={editing} faculty={faculty} onDone={load} />}
    </div>
  );
}

function CourseForm({ open, setOpen, editing, faculty, onDone }) {
  const [form, setForm] = useState(editing ? {
    ...empty, ...editing,
    curriculum: editing.curriculum || [], outcomes: editing.outcomes || [], faculty_ids: editing.faculty_ids || [],
  } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleFac = (id) => set("faculty_ids", form.faculty_ids.includes(id) ? form.faculty_ids.filter((x) => x !== id) : [...form.faculty_ids, id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = { ...form, fee_amount: Number(form.fee_amount) || 0 };
    try {
      if (editing) await api.put(`/admin/courses/${editing.id}`, payload);
      else await api.post("/admin/courses", payload);
      toast.success(editing ? "Course updated" : "Course created");
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="course-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="course-title-input" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Level</Label>
              <Select value={form.level} onValueChange={(v) => set("level", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Duration</Label><Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 6 months" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Fee amount</Label><Input type="number" value={form.fee_amount} onChange={(e) => set("fee_amount", e.target.value)} data-testid="course-fee-input" /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger data-testid="course-status-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Curriculum (one per line)</Label><Textarea rows={4} value={form.curriculum.join("\n")} onChange={(e) => set("curriculum", e.target.value.split("\n").filter(Boolean))} /></div>
            <div className="space-y-1.5"><Label>Learning outcomes (one per line)</Label><Textarea rows={4} value={form.outcomes.join("\n")} onChange={(e) => set("outcomes", e.target.value.split("\n").filter(Boolean))} /></div>
          </div>
          <div className="space-y-2">
            <Label>Assigned faculty</Label>
            <div className="flex flex-wrap gap-2">
              {faculty.map((f) => (
                <button type="button" key={f.id} onClick={() => toggleFac(f.id)} className={cn("rounded-full border px-3 py-1 text-sm", form.faculty_ids.includes(f.id) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600")}>{f.name}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <Label>Admissions open</Label>
            <Switch checked={form.admission_open} onCheckedChange={(v) => set("admission_open", v)} data-testid="course-admission-switch" />
          </div>
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="course-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Course"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
