import { useState } from "react";
import { toast } from "sonner";
import { Link2, Unlink, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { api, errMsg, formatDate } from "@/lib/api";
import { cn } from "@/lib/utils";

export const AccountLinkPanel = ({ student, account, onDone }) => (
  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="account-link-panel">
    <div className="flex items-start gap-2 text-sm">
      <UserCheck className={cn("mt-0.5 h-4 w-4 shrink-0", account ? "text-teal-600" : "text-slate-400")} />
      {account ? (
        <span className="break-all text-slate-700" data-testid="linked-account-info">
          Login account: <strong>{account.email}</strong>
          <span className="text-slate-500"> · {account.auth_provider === "google" ? "Google" : "Password"}</span>
        </span>
      ) : (
        <span className="text-slate-500" data-testid="no-linked-account">No login account linked. The student can't see fees or attendance in their portal yet.</span>
      )}
    </div>
    {account ? <UnlinkButton studentId={student.id} onDone={onDone} /> : <LinkDialog student={student} onDone={onDone} />}
  </div>
);

const UnlinkButton = ({ studentId, onDone }) => (
  <ConfirmButton title="Unlink login account?" description="The account stays active but will no longer see this student's fees and attendance."
    confirmText="Unlink" destructive testid="unlink-account-dialog"
    onConfirm={async () => {
      try { await api.post(`/admin/students/${studentId}/unlink-account`); toast.success("Account unlinked"); onDone(); }
      catch (e) { toast.error(errMsg(e)); }
    }}>
    <Button variant="outline" size="sm" className="shrink-0" data-testid="unlink-account-btn"><Unlink className="mr-1.5 h-4 w-4" /> Unlink</Button>
  </ConfirmButton>
);

function LinkDialog({ student, onDone }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  const onOpenChange = async (v) => {
    setOpen(v);
    if (!v) return;
    setSelected(""); setQ(""); setAccounts(null);
    try { const { data } = await api.get("/admin/student-accounts"); setAccounts(data); }
    catch (e) { toast.error(errMsg(e)); setAccounts([]); }
  };

  const isMatch = (a) => Boolean((student.email && a.email === student.email.toLowerCase()) || (student.phone && a.phone === student.phone));
  const list = (accounts || [])
    .filter((a) => `${a.name} ${a.email} ${a.phone || ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => isMatch(b) - isMatch(a));

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/students/${student.id}/link-account`, { user_id: selected });
      toast.success("Account linked. A welcome email is on its way to the student.");
      setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0 bg-teal-600 hover:bg-teal-700" data-testid="link-account-btn"><Link2 className="mr-1.5 h-4 w-4" /> Link account</Button>
      </DialogTrigger>
      <DialogContent data-testid="link-account-dialog">
        <DialogHeader>
          <DialogTitle>Link a login account</DialogTitle>
          <DialogDescription>Pick the signed-up account that belongs to {student.name}. They will then see their fees and attendance in the student portal.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} data-testid="link-account-search" />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {accounts === null ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            : list.length === 0 ? <p className="py-6 text-center text-sm text-slate-400" data-testid="link-account-empty">No unlinked student accounts found.</p>
            : list.map((a) => <AccountOption key={a.id} account={a} match={isMatch(a)} active={selected === a.id} onSelect={() => setSelected(a.id)} />)}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!selected || saving} className="bg-teal-600 hover:bg-teal-700" data-testid="link-account-save">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AccountOption = ({ account, match, active, onSelect }) => (
  <button type="button" onClick={onSelect} data-testid={`link-account-option-${account.id}`}
    className={cn("w-full rounded-lg border p-3 text-left transition-colors", active ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:bg-slate-50")}>
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium text-slate-800">{account.name}</span>
      {match && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-700">Likely match</span>}
    </div>
    <p className="truncate text-xs text-slate-500">{account.email}{account.phone ? ` · ${account.phone}` : ""} · Signed up {formatDate(account.created_at)}</p>
  </button>
);
