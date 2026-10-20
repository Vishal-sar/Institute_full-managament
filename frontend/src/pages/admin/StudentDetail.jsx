import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, CalendarDays, Wallet, Plus, Printer, Undo2, Loader2,
  Repeat, Power, Receipt as ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, formatCurrency, formatDate } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { Loader } from "@/components/common/Loader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { printReceipt } from "@/lib/receipt";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lookups = useLookups();
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/admin/students/${id}`); setProfile(data); }
    catch (e) { toast.error(errMsg(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!profile) return <Loader full />;
  const { student, course, batch, fees, attendance } = profile;

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="text-slate-600" onClick={() => navigate("/admin/students")}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to students</Button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">{student.name[0]}</div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">{student.name}</h1>
              <p className="font-mono text-xs text-slate-400">{student.student_code}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {student.phone}</span>
                {student.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {student.email}</span>}
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Joined {formatDate(student.admission_date)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={student.status} />
            <TransferDialog student={student} lookups={lookups} onDone={load} />
            <ConfirmButton title={student.status === "active" ? "Deactivate student?" : "Activate student?"}
              description="Financial and attendance history is preserved."
              confirmText={student.status === "active" ? "Deactivate" : "Activate"} destructive={student.status === "active"}
              testid="toggle-status-dialog"
              onConfirm={async () => { try { const { data } = await api.post(`/admin/students/${id}/toggle-status`); toast.success(`Student ${data.status}`); load(); } catch (e) { toast.error(errMsg(e)); } }}>
              <Button variant="outline" size="sm" data-testid="toggle-status-btn"><Power className="mr-1.5 h-4 w-4" /> {student.status === "active" ? "Deactivate" : "Activate"}</Button>
            </ConfirmButton>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div><p className="text-xs uppercase tracking-wide text-slate-400">Course</p><p className="text-sm font-medium text-slate-800">{course?.title || "—"}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-400">Batch</p><p className="text-sm font-medium text-slate-800">{batch?.name || "—"}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-400">Notes</p><p className="text-sm text-slate-600">{student.notes || "—"}</p></div>
        </div>
      </div>

      <Tabs defaultValue="fees">
        <TabsList data-testid="student-tabs">
          <TabsTrigger value="fees">Fee Ledger</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Fee" value={formatCurrency(fees.total)} icon={Wallet} accent="navy" />
            <StatCard label="Paid" value={formatCurrency(fees.paid)} icon={Wallet} accent="green" />
            <StatCard label="Outstanding" value={formatCurrency(fees.outstanding)} icon={Wallet} accent="rose" testid="student-outstanding" />
          </div>

          <div className="flex flex-wrap gap-2">
            <InstallmentDialog studentId={id} onDone={load} />
            <PaymentDialog studentId={id} installments={fees.installments} onDone={load} />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Installments</div>
            {fees.installments.length === 0 ? <p className="p-5 text-sm text-slate-400">No installments yet.</p> : (
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead>Label</TableHead><TableHead>Due date</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {fees.installments.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-slate-800">{i.label}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(i.due_date)}</TableCell>
                      <TableCell>{formatCurrency(i.net_amount)}</TableCell>
                      <TableCell>{formatCurrency(i.paid_amount)}</TableCell>
                      <TableCell><StatusBadge status={i.payment_status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Payment history</div>
            {fees.payments.length === 0 ? <p className="p-5 text-sm text-slate-400">No payments recorded.</p> : (
              <Table data-testid="payments-table">
                <TableHeader className="bg-slate-50"><TableRow><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {fees.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(p.created_at)}</TableCell>
                      <TableCell className="capitalize text-slate-600">{p.method.replace(/_/g, " ")}</TableCell>
                      <TableCell className={p.reversed ? "text-slate-400 line-through" : "font-medium"}>{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={async () => { try { const { data } = await api.get(`/admin/payments/${p.id}/receipt`); printReceipt(data); } catch (e) { toast.error(errMsg(e)); } }} data-testid={`print-receipt-${p.reference}`}><Printer className="h-4 w-4" /></Button>
                          {!p.reversed && (
                            <ConfirmButton title="Reverse this payment?" description="This marks the payment as reversed and updates the outstanding balance. The record is preserved for audit."
                              confirmText="Reverse" destructive onConfirm={async () => { try { await api.post(`/admin/payments/${p.id}/reverse`); toast.success("Payment reversed"); load(); } catch (e) { toast.error(errMsg(e)); } }}>
                              <Button variant="ghost" size="sm" className="text-rose-600"><Undo2 className="h-4 w-4" /></Button>
                            </ConfirmButton>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Sessions" value={attendance.total} accent="navy" />
            <StatCard label="Present" value={attendance.present} accent="green" />
            <StatCard label="Absent" value={attendance.absent} accent="rose" />
            <StatCard label="Attendance %" value={`${attendance.percentage}%`} accent="teal" testid="student-attendance-pct" />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {attendance.records.length === 0 ? <p className="p-5 text-sm text-slate-400">No attendance records yet.</p> : (
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Marked by</TableHead></TableRow></TableHeader>
                <TableBody>{attendance.records.map((r) => (<TableRow key={r.id}><TableCell>{formatDate(r.session_date)}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell><TableCell className="text-slate-600">{r.marked_by}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransferDialog({ student, lookups, onDone }) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(student.course_id || "");
  const [batchId, setBatchId] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const batches = lookups.batches.filter((b) => b.course_id === courseId);

  const submit = async () => {
    if (!courseId || !batchId) return toast.error("Select course and batch");
    setSaving(true);
    try {
      await api.post(`/admin/students/${student.id}/enroll`, { course_id: courseId, batch_id: batchId, override_capacity: override, override_reason: reason });
      toast.success("Enrollment updated"); setOpen(false); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" data-testid="transfer-btn"><Repeat className="mr-1.5 h-4 w-4" /> Assign / Transfer</Button></DialogTrigger>
      <DialogContent data-testid="transfer-dialog">
        <DialogHeader><DialogTitle>Assign or transfer batch</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Course</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setBatchId(""); }}><SelectTrigger data-testid="transfer-course"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId} disabled={!courseId}><SelectTrigger data-testid="transfer-batch"><SelectValue placeholder="Select batch" /></SelectTrigger>
              <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Override capacity limit (authorized)</label>
          {override && <Input placeholder="Reason for override" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </div>
        <DialogFooter><Button onClick={submit} className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="transfer-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstallmentDialog({ studentId, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "Installment", amount: "", due_date: "", discount: "0" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      await api.post("/admin/installments", { student_id: studentId, label: form.label, amount: Number(form.amount), due_date: form.due_date || null, discount: Number(form.discount || 0) });
      toast.success("Installment added"); setOpen(false); setForm({ label: "Installment", amount: "", due_date: "", discount: "0" }); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" data-testid="add-installment-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Installment</Button></DialogTrigger>
      <DialogContent data-testid="installment-dialog">
        <DialogHeader><DialogTitle>Add installment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="installment-amount" /></div>
            <div className="space-y-1.5"><Label>Discount</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="installment-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ studentId, installments, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ installment_id: "", amount: "", method: "cash", payment_ref: "", note: "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      await api.post("/admin/payments", { student_id: studentId, installment_id: form.installment_id || null, amount: Number(form.amount), method: form.method, payment_ref: form.payment_ref, note: form.note });
      toast.success("Offline payment recorded"); setOpen(false); setForm({ installment_id: "", amount: "", method: "cash", payment_ref: "", note: "" }); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700" data-testid="record-payment-btn"><ReceiptIcon className="mr-1.5 h-4 w-4" /> Record Payment</Button></DialogTrigger>
      <DialogContent data-testid="payment-dialog">
        <DialogHeader><DialogTitle>Record offline payment</DialogTitle></DialogHeader>
        <p className="-mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">This records an offline/manual payment. No online gateway is charged.</p>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Apply to installment (optional)</Label>
            <Select value={form.installment_id} onValueChange={(v) => setForm({ ...form, installment_id: v })}><SelectTrigger data-testid="payment-installment"><SelectValue placeholder="General payment" /></SelectTrigger>
              <SelectContent>{installments.map((i) => <SelectItem key={i.id} value={i.id}>{i.label} · {formatCurrency(i.net_amount)}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="payment-amount" /></div>
            <div className="space-y-1.5"><Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}><SelectTrigger data-testid="payment-method"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Payment reference (optional)</Label><Input value={form.payment_ref} onChange={(e) => setForm({ ...form, payment_ref: e.target.value })} placeholder="UTR / txn id" /></div>
          <div className="space-y-1.5"><Label>Note</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="payment-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Payment"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
