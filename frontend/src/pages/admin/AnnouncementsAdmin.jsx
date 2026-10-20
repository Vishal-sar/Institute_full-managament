import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, errMsg, formatDate } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

const empty = { title: "", body: "", audience: "all", publish_date: "", status: "published" };

export default function AnnouncementsAdmin() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/announcements"); setItems(data); } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Publish notices to the website, students or faculty.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setEditing(null); setOpen(true); }} data-testid="add-announcement-btn"><Plus className="mr-1.5 h-4 w-4" /> New Announcement</Button>
      </PageHeader>

      {items === null ? <Loader /> : items.length === 0 ? <EmptyState title="No announcements yet" icon={Megaphone} /> : (
        <div className="space-y-4" data-testid="announcements-admin-list">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900">{a.title}</h3>
                    <StatusBadge status={a.status} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{a.audience}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(a.publish_date)} · by {a.created_by}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setOpen(true); }} data-testid={`edit-announcement-${a.id}`}><Pencil className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <AnnForm open={open} setOpen={setOpen} editing={editing} onDone={load} />}
    </div>
  );
}

function AnnForm({ open, setOpen, editing, onDone }) {
  const [form, setForm] = useState(editing ? { ...empty, ...editing } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body are required");
    setSaving(true);
    const payload = { title: form.title, body: form.body, audience: form.audience, status: form.status, publish_date: form.publish_date || null };
    try {
      if (editing) await api.put(`/admin/announcements/${editing.id}`, payload);
      else await api.post("/admin/announcements", payload);
      toast.success(editing ? "Announcement updated" : "Announcement published");
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" data-testid="announcement-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="announcement-title-input" /></div>
          <div className="space-y-1.5"><Label>Body *</Label><Textarea rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} data-testid="announcement-body-input" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => set("audience", v)}><SelectTrigger data-testid="announcement-audience-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="all">Everyone</SelectItem><SelectItem value="students">Students</SelectItem><SelectItem value="faculty">Faculty</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Publish date</Label><Input type="date" value={form.publish_date || ""} onChange={(e) => set("publish_date", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
            </div>
          </div>
          {form.body && <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Preview</p><p className="text-sm font-semibold text-slate-800">{form.title}</p><p className="text-sm text-slate-600">{form.body}</p></div>}
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="announcement-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
