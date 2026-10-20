import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, CalendarCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errMsg, formatDate } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

export default function DemoBookingsAdmin() {
  const lookups = useLookups();
  const [bookings, setBookings] = useState(null);
  const [slots, setSlots] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([api.get("/admin/demo-bookings"), api.get("/admin/demo-slots")]);
      setBookings(b.data); setSlots(s.data);
    } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    try { await api.put(`/admin/demo-bookings/${id}?status=${status}`); toast.success(`Booking ${status}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Demo Classes" description="Manage demo bookings and publish available slots.">
        <SlotDialog open={open} setOpen={setOpen} lookups={lookups} onDone={load} />
      </PageHeader>

      <Tabs defaultValue="bookings">
        <TabsList><TabsTrigger value="bookings">Bookings</TabsTrigger><TabsTrigger value="slots">Available Slots</TabsTrigger></TabsList>

        <TabsContent value="bookings">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {bookings === null ? <Loader /> : bookings.length === 0 ? <EmptyState title="No demo bookings yet" icon={CalendarCheck} /> : (
              <div className="overflow-x-auto">
                <Table data-testid="demo-bookings-table">
                  <TableHeader className="bg-slate-50"><TableRow><TableHead>Reference</TableHead><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Session</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id} data-testid={`demo-booking-${b.reference}`}>
                        <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                        <TableCell><p className="font-medium text-slate-900">{b.name}</p><p className="text-xs text-slate-400">{b.phone}</p></TableCell>
                        <TableCell className="text-slate-600">{b.course_title}</TableCell>
                        <TableCell className="text-xs text-slate-600">{formatDate(b.session_date)} · {b.session_time}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {b.status !== "confirmed" && <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(b.id, "confirmed")} data-testid={`confirm-demo-${b.reference}`}><Check className="h-4 w-4" /></Button>}
                            {b.status !== "cancelled" && <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => updateStatus(b.id, "cancelled")} data-testid={`cancel-demo-${b.reference}`}><X className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="slots">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {slots === null ? <Loader /> : slots.length === 0 ? <EmptyState title="No slots published" description="Add a slot so visitors can book demos." /> : (
              <div className="overflow-x-auto">
                <Table data-testid="demo-slots-table">
                  <TableHeader className="bg-slate-50"><TableRow><TableHead>Course</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Capacity</TableHead><TableHead>Booked</TableHead><TableHead>Available</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {slots.map((s) => (
                      <TableRow key={s.id}><TableCell className="text-slate-700">{s.course_title}</TableCell><TableCell>{formatDate(s.date)}</TableCell><TableCell>{s.time}</TableCell><TableCell>{s.capacity}</TableCell><TableCell>{s.booked_count}</TableCell><TableCell className={s.available <= 0 ? "text-rose-600" : "text-emerald-600"}>{s.available}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SlotDialog({ open, setOpen, lookups, onDone }) {
  const [form, setForm] = useState({ course_id: "", date: "", time: "11:00", capacity: 15 });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.course_id || !form.date) return toast.error("Course and date are required");
    setSaving(true);
    try { await api.post("/admin/demo-slots", { ...form, capacity: Number(form.capacity) || 1 }); toast.success("Slot added"); setOpen(false); setForm({ course_id: "", date: "", time: "11:00", capacity: 15 }); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-slot-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Slot</Button></DialogTrigger>
      <DialogContent data-testid="slot-dialog">
        <DialogHeader><DialogTitle>Publish demo slot</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Course</Label><Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}><SelectTrigger data-testid="slot-course-select"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="slot-date-input" /></div>
            <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="slot-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Slot"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
