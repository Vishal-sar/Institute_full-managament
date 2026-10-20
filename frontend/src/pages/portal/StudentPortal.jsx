import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, Wallet, ClipboardList, Megaphone, Printer, Clock, BookOpen, MapPin,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMsg, formatCurrency, formatDate } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { printReceipt } from "@/lib/receipt";

export default function StudentPortal() {
  const [data, setData] = useState(null);
  const [contact, setContact] = useState({ phone: "", email: "" });

  const load = () => api.get("/portal/student/overview").then((r) => {
    setData(r.data);
    setContact({ phone: r.data.student.phone || "", email: r.data.student.email || "" });
  }).catch((e) => { setData(false); toast.error(errMsg(e)); });

  useEffect(() => { load(); }, []);

  if (data === null) return <PortalShell title="Student"><Loader full /></PortalShell>;
  if (data === false) return <PortalShell title="Student"><EmptyState title="No student profile linked" description="Your account is not yet linked to a student record. Please contact the institute." /></PortalShell>;

  const { student, course, batch, schedule, fees, attendance, announcements } = data;

  const saveContact = async () => {
    try { await api.put("/portal/student/contact", { phone: contact.phone, email: contact.email || null }); toast.success("Contact updated"); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const printOne = async (pid) => {
    try { const { data } = await api.get(`/portal/student/payments/${pid}/receipt`); printReceipt(data); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <PortalShell title="Student Portal">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Welcome, {student.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">{course?.title || "No course assigned"} · {batch?.name || "No batch"}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${attendance.percentage}%`} icon={ClipboardList} accent="teal" testid="portal-attendance-pct" />
        <StatCard label="Sessions" value={attendance.total} icon={CalendarDays} accent="navy" />
        <StatCard label="Fees Paid" value={formatCurrency(fees.paid)} icon={Wallet} accent="green" />
        <StatCard label="Outstanding" value={formatCurrency(fees.outstanding)} icon={Wallet} accent="rose" testid="portal-outstanding" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="student-portal-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900"><Clock className="h-4 w-4 text-teal-600" /> Class schedule</h3>
              {schedule ? (
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> {batch?.name} · {schedule.mode}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> {(schedule.days || []).join(", ")}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> {schedule.start_time}–{schedule.end_time}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {schedule.location}</p>
                </div>
              ) : <p className="mt-4 text-sm text-slate-400">No batch assigned yet.</p>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900"><Wallet className="h-4 w-4 text-teal-600" /> Fee reminder</h3>
              {fees.outstanding > 0 ? (
                <div className="mt-4"><p className="text-2xl font-bold text-rose-600">{formatCurrency(fees.outstanding)}</p><p className="text-sm text-slate-500">outstanding balance</p></div>
              ) : <p className="mt-4 text-sm text-emerald-600">All fees are cleared. Thank you!</p>}
            </div>
          </div>
          <AnnouncementsList announcements={announcements} />
        </TabsContent>

        <TabsContent value="fees" className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Installments</div>
            {fees.installments.length === 0 ? <p className="p-5 text-sm text-slate-400">No fee plan set.</p> : (
              <Table><TableHeader className="bg-slate-50"><TableRow><TableHead>Label</TableHead><TableHead>Due</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{fees.installments.map((i) => <TableRow key={i.id}><TableCell>{i.label}</TableCell><TableCell>{formatDate(i.due_date)}</TableCell><TableCell>{formatCurrency(i.net_amount)}</TableCell><TableCell>{formatCurrency(i.paid_amount)}</TableCell><TableCell><StatusBadge status={i.payment_status} /></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Payment history & receipts</div>
            {fees.payments.length === 0 ? <p className="p-5 text-sm text-slate-400">No payments yet.</p> : (
              <Table data-testid="student-payments"><TableHeader className="bg-slate-50"><TableRow><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Receipt</TableHead></TableRow></TableHeader>
                <TableBody>{fees.payments.map((p) => <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.reference}</TableCell><TableCell>{formatDate(p.created_at)}</TableCell><TableCell className={p.reversed ? "line-through text-slate-400" : ""}>{formatCurrency(p.amount)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => printOne(p.id)} data-testid={`student-receipt-${p.reference}`}><Printer className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="student-attendance-table">
            {attendance.records.length === 0 ? <EmptyState title="No attendance records yet" icon={ClipboardList} /> : (
              <Table><TableHeader className="bg-slate-50"><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{attendance.records.map((r) => <TableRow key={r.id}><TableCell>{formatDate(r.session_date)}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-semibold text-slate-900">Update contact details</h3>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} data-testid="student-phone-input" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} data-testid="student-email-input" /></div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveContact} data-testid="student-contact-save">Save</Button>
          </div>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}

function AnnouncementsList({ announcements }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900"><Megaphone className="h-4 w-4 text-teal-600" /> Announcements</h3>
      {announcements.length === 0 ? <p className="mt-4 text-sm text-slate-400">No announcements.</p> : (
        <div className="mt-4 space-y-3">
          {announcements.map((a) => (<div key={a.id} className="border-b border-slate-100 pb-3 last:border-0"><p className="text-sm font-semibold text-slate-800">{a.title}</p><p className="text-sm text-slate-600">{a.body}</p><p className="mt-1 text-xs text-slate-400">{formatDate(a.publish_date)}</p></div>))}
        </div>
      )}
    </div>
  );
}
