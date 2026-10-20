import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, errMsg } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

const empty = { name: "", subjects: [], qualifications: [], bio: "", experience: "", languages: [], photo_url: "", active: true, course_ids: [] };
const toArr = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function FacultyAdmin() {
  const [faculty, setFaculty] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/faculty"); setFaculty(data); } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Faculty" description="Manage faculty profiles shown on the public website.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setEditing(null); setOpen(true); }} data-testid="add-faculty-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Faculty</Button>
      </PageHeader>

      {faculty === null ? <Loader /> : faculty.length === 0 ? <EmptyState title="No faculty yet" icon={GraduationCap} /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="faculty-admin-grid">
          {faculty.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100">
                  {f.photo_url ? <img src={f.photo_url} alt={f.name} className="h-full w-full object-cover" /> : <UserRound className="m-4 h-6 w-6 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{f.name}</p>
                  <p className="truncate text-sm text-teal-600">{(f.subjects || []).join(", ")}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-500">{f.bio}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-medium ${f.active ? "text-emerald-600" : "text-slate-400"}`}>{f.active ? "Active" : "Hidden"}</span>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(f); setOpen(true); }} data-testid={`edit-faculty-${f.slug}`}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <FacultyForm open={open} setOpen={setOpen} editing={editing} onDone={load} />}
    </div>
  );
}

function FacultyForm({ open, setOpen, editing, onDone }) {
  const [form, setForm] = useState(editing ? { ...empty, ...editing } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = { ...form, course_ids: form.course_ids || [] };
    try {
      if (editing) await api.put(`/admin/faculty/${editing.id}`, payload);
      else await api.post("/admin/faculty", payload);
      toast.success(editing ? "Faculty updated" : "Faculty added");
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="faculty-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit faculty" : "New faculty"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="faculty-name-input" /></div>
          <div className="space-y-1.5"><Label>Photo URL</Label><Input value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><Label>Subjects (comma-separated)</Label><Input value={(form.subjects || []).join(", ")} onChange={(e) => set("subjects", toArr(e.target.value))} data-testid="faculty-subjects-input" /></div>
          <div className="space-y-1.5"><Label>Qualifications (comma-separated)</Label><Input value={(form.qualifications || []).join(", ")} onChange={(e) => set("qualifications", toArr(e.target.value))} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Experience</Label><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 8 years" /></div>
            <div className="space-y-1.5"><Label>Languages (comma-separated)</Label><Input value={(form.languages || []).join(", ")} onChange={(e) => set("languages", toArr(e.target.value))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Biography</Label><Textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><Label>Visible on website</Label><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} data-testid="faculty-active-switch" /></div>
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="faculty-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Faculty"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
