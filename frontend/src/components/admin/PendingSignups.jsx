import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Link2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg, formatDate } from "@/lib/api";

export const PendingSignups = ({ onLinked }) => {
  const [accounts, setAccounts] = useState([]);
  const [busy, setBusy] = useState("");
  const [picking, setPicking] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/admin/student-accounts"); setAccounts(data); }
    catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doLink = async (studentId, account) => {
    setBusy(account.id);
    try {
      await api.post(`/admin/students/${studentId}/link-account`, { user_id: account.id });
      toast.success(`Linked ${account.name}. A welcome email is on its way to ${account.email}.`);
      setPicking(null); load(); onLinked?.();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(""); }
  };

  if (accounts.length === 0) return null;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5" data-testid="pending-signups">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <UserPlus className="h-4 w-4 text-amber-700" />
        <h2 className="text-sm font-semibold text-slate-900">New sign-ups waiting</h2>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900" data-testid="pending-signups-count">{accounts.length}</span>
        <p className="w-full text-xs text-slate-500 sm:ml-2 sm:w-auto">Link each account to its student record so they can see their fees and attendance.</p>
      </div>
      <ul className="max-h-80 divide-y divide-amber-100 overflow-y-auto rounded-lg border border-amber-100 bg-white">
        {accounts.map((a) => <SignupRow key={a.id} account={a} busy={busy === a.id} onLink={doLink} onPick={() => setPicking(a)} />)}
      </ul>
      <PickStudentDialog account={picking} busy={!!picking && busy === picking.id} onClose={() => setPicking(null)} onLink={doLink} />
    </section>
  );
};

const SignupRow = ({ account, busy, onLink, onPick }) => {
  const s = account.suggested_student;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`pending-signup-${account.id}`}>
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{account.name}</p>
        <p className="truncate text-xs text-slate-500">{account.email}{account.phone ? ` · ${account.phone}` : ""} · Signed up {formatDate(account.created_at)}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {s && (
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" disabled={busy} onClick={() => onLink(s.id, account)} data-testid={`quick-link-${account.id}`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 className="mr-1.5 h-4 w-4" /> Link to {s.name} ({s.student_code})</>}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onPick} data-testid={`choose-student-${account.id}`}>{s ? "Other student" : "Choose student"}</Button>
      </div>
    </li>
  );
};

function PickStudentDialog({ account, busy, onClose, onLink }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!account) { setQ(""); setResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: 8 });
        if (q) params.set("search", q);
        const { data } = await api.get(`/admin/students?${params}`);
        setResults(data.items);
      } catch (e) { toast.error(errMsg(e)); setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, account]);

  return (
    <Dialog open={!!account} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent data-testid="pick-student-dialog">
        <DialogHeader>
          <DialogTitle>Link {account?.name}</DialogTitle>
          <DialogDescription>Find the student record that belongs to {account?.email}.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name, phone or code" value={q} onChange={(e) => setQ(e.target.value)} data-testid="pick-student-search" />
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {results === null ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            : results.length === 0 ? <p className="py-6 text-center text-sm text-slate-400" data-testid="pick-student-empty">No matching students.</p>
            : results.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="truncate text-xs text-slate-500">{s.student_code} · {s.phone}{s.course_title ? ` · ${s.course_title}` : ""}</p>
                </div>
                <Button size="sm" disabled={busy} onClick={() => onLink(s.id, account)} className="shrink-0 bg-teal-600 hover:bg-teal-700" data-testid={`pick-student-${s.id}`}>Link</Button>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
