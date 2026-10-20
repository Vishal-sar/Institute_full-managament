import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Download, Loader2, UserPlus, ChevronLeft, ChevronRight, MessageSquarePlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, API, formatDate } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

const STATUSES = ["new", "contacted", "follow_up", "demo_scheduled", "interested", "converted", "not_interested", "closed"];
const PAGE = 20;

export default function Enquiries() {
  const lookups = useLookups();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [convert, setConvert] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ skip: page * PAGE, limit: PAGE });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    try { const { data } = await api.get(`/admin/enquiries?${params}`); setData(data); } catch (e) { toast.error(errMsg(e)); }
  }, [page, search, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const total = data?.total || 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-6">
      <PageHeader title="Admissions CRM" description={`${total} enquiry record${total === 1 ? "" : "s"} — track leads and follow-ups`}>
        <Button variant="outline" asChild data-testid="enquiries-export-btn"><a href={`${API}/admin/enquiries/export`}><Download className="mr-1.5 h-4 w-4" /> Export CSV</a></Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder="Search name, phone, reference…" className="pl-9" data-testid="enquiries-search" />
        </div>
        <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
          <SelectTrigger className="w-full sm:w-52" data-testid="enquiries-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {data === null ? <Loader /> : data.items.length === 0 ? <EmptyState title="No enquiries found" icon={UserPlus} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="enquiries-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Reference</TableHead><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Source</TableHead><TableHead>Follow-up</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.items.map((e) => (
                  <TableRow key={e.id} className={e.overdue ? "bg-rose-50/40" : ""} data-testid={`enquiry-row-${e.reference}`}>
                    <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                    <TableCell><p className="font-medium text-slate-900">{e.name}</p><p className="text-xs text-slate-400">{e.phone}</p></TableCell>
                    <TableCell className="text-slate-600">{e.course_title || "—"}</TableCell>
                    <TableCell className="capitalize text-slate-600">{(e.source || "").replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs">{e.follow_up_date ? <span className={e.overdue ? "font-medium text-rose-600" : "text-slate-600"}>{formatDate(e.follow_up_date)}{e.overdue ? " · overdue" : ""}</span> : "—"}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(e)} data-testid={`manage-enquiry-${e.reference}`}><MessageSquarePlus className="h-4 w-4" /></Button>
                        {e.status !== "converted" && <Button variant="ghost" size="sm" className="text-teal-600" onClick={() => setConvert(e)} data-testid={`convert-enquiry-${e.reference}`}><UserCheck className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page + 1} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {selected && <ManageDialog enquiry={selected} lookups={lookups} onClose={() => setSelected(null)} onDone={load} />}
      {convert && <ConvertDialog enquiry={convert} lookups={lookups} onClose={() => setConvert(null)} onDone={load} />}
    </div>
  );
}

function ManageDialog({ enquiry, lookups, onClose, onDone }) {
  const [status, setStatus] = useState(enquiry.status);
  const [assigned, setAssigned] = useState(enquiry.assigned_to || "");
  const [followDate, setFollowDate] = useState(enquiry.follow_up_date || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const saveMeta = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/enquiries/${enquiry.id}`, { status, assigned_to: assigned || null, follow_up_date: followDate || null });
      toast.success("Enquiry updated"); onDone(); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try { await api.post(`/admin/enquiries/${enquiry.id}/followup`, { note, next_date: followDate || null, status }); toast.success("Follow-up added"); setNote(""); onDone(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="manage-enquiry-dialog">
        <DialogHeader><DialogTitle>Manage {enquiry.reference}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800">{enquiry.name} · {enquiry.phone}</p><p className="text-slate-500">{enquiry.course_title || "No course"} · {enquiry.message || "No message"}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}><SelectTrigger data-testid="enquiry-status-select"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Assign to</Label>
              <Select value={assigned} onValueChange={setAssigned}><SelectTrigger data-testid="enquiry-assign-select"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent>{lookups.staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Follow-up date</Label><Input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} data-testid="enquiry-followup-date" /></div>
          <Button onClick={saveMeta} className="w-full bg-slate-900 hover:bg-slate-800" disabled={saving} data-testid="enquiry-save-meta">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</Button>

          <div className="border-t border-slate-100 pt-4">
            <Label>Add follow-up note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" placeholder="Spoke with student…" data-testid="enquiry-note-input" />
            <Button onClick={addNote} variant="outline" size="sm" className="mt-2" data-testid="enquiry-add-note">Add note</Button>
            {(enquiry.notes || []).length > 0 && (
              <div className="mt-4 space-y-2">
                {enquiry.notes.map((n) => (<div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm"><p className="text-slate-700">{n.note}</p><p className="mt-1 text-xs text-slate-400">{n.by} · {formatDate(n.at)}</p></div>))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ enquiry, lookups, onClose, onDone }) {
  const [courseId, setCourseId] = useState(enquiry.course_id || "");
  const [batchId, setBatchId] = useState("");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const batches = lookups.batches.filter((b) => b.course_id === courseId);

  const submit = async () => {
    if (!courseId || !batchId) return toast.error("Select course and batch");
    setSaving(true);
    try {
      const { data } = await api.post(`/admin/enquiries/${enquiry.id}/convert`, { course_id: courseId, batch_id: batchId, fee_total: fee === "" ? null : Number(fee) });
      toast.success(`Converted to student ${data.student_code}`); onDone(); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent data-testid="convert-dialog">
        <DialogHeader><DialogTitle>Convert {enquiry.name} to student</DialogTitle></DialogHeader>
        <p className="-mt-2 text-sm text-slate-500">A student record is created only when this succeeds. Contact details carry over.</p>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Course *</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setBatchId(""); }}><SelectTrigger data-testid="convert-course"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Batch *</Label>
            <Select value={batchId} onValueChange={setBatchId} disabled={!courseId}><SelectTrigger data-testid="convert-batch"><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Total fee (optional)</Label><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Defaults to course fee" /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="convert-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Convert to Student"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
