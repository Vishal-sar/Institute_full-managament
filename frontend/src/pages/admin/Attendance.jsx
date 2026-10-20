import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Save, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg, API } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "present", label: "Present", cls: "bg-emerald-600 text-white", off: "text-emerald-700 border-emerald-200" },
  { value: "absent", label: "Absent", cls: "bg-rose-600 text-white", off: "text-rose-700 border-rose-200" },
  { value: "late", label: "Late", cls: "bg-amber-500 text-white", off: "text-amber-700 border-amber-200" },
  { value: "excused", label: "Excused", cls: "bg-blue-600 text-white", off: "text-blue-700 border-blue-200" },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Attendance() {
  const lookups = useLookups();
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoster = async (bid = batchId, d = date) => {
    if (!bid || !d) return;
    setLoading(true); setRoster(null);
    try {
      const { data } = await api.get(`/admin/attendance?batch_id=${bid}&session_date=${d}`);
      setRoster(data.roster.map((r) => ({ ...r, status: r.status || "present" })));
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  };

  const setStatus = (sid, status) => setRoster((r) => r.map((x) => (x.student_id === sid ? { ...x, status } : x)));
  const markAll = (status) => setRoster((r) => r.map((x) => ({ ...x, status })));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/admin/attendance", { batch_id: batchId, session_date: date, entries: roster.map((r) => ({ student_id: r.student_id, status: r.status })) });
      toast.success(`Attendance saved for ${data.saved} students`);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark attendance for a batch session." />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5"><Label>Batch</Label>
          <Select value={batchId} onValueChange={(v) => { setBatchId(v); loadRoster(v, date); }}><SelectTrigger data-testid="attendance-batch-select"><SelectValue placeholder="Select a batch" /></SelectTrigger>
            <SelectContent>{lookups.batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5"><Label>Session date</Label><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); loadRoster(batchId, e.target.value); }} data-testid="attendance-date-input" /></div>
        <Button variant="outline" onClick={() => loadRoster()} disabled={!batchId} data-testid="attendance-load-btn">Load roster</Button>
      </div>

      {!batchId ? (
        <EmptyState title="Select a batch and date" icon={ClipboardList} description="Pick a batch to load its enrolled students." />
      ) : loading ? <Loader /> : roster === null ? null : roster.length === 0 ? (
        <EmptyState title="No active students in this batch" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-slate-500">Quick mark all:</span>
              {STATUSES.map((s) => <button key={s.value} onClick={() => markAll(s.value)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid={`markall-${s.value}`}>{s.label}</button>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild><a href={`${API}/admin/attendance/export?batch_id=${batchId}`}><Download className="mr-1.5 h-4 w-4" /> Export</a></Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={save} disabled={saving} data-testid="attendance-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save Attendance</>}</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="attendance-roster">
            {roster.map((r, i) => (
              <div key={r.student_id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between", i > 0 && "border-t border-slate-100")}>
                <div><p className="font-medium text-slate-900">{r.name}</p><p className="font-mono text-xs text-slate-400">{r.student_code}</p></div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s.value} onClick={() => setStatus(r.student_id, s.value)} data-testid={`attendance-${r.student_code}-${s.value}`}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", r.status === s.value ? s.cls + " border-transparent" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
