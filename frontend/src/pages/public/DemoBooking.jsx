import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg, formatDate } from "@/lib/api";
import { Seo } from "@/components/common/Seo";
import { cn } from "@/lib/utils";

export default function DemoBooking() {
  const [params] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get("/courses").then((r) => {
      setCourses(r.data);
      const pre = params.get("course");
      if (pre && r.data.some((c) => c.id === pre)) setCourseId(pre);
    }).catch(() => {});
  }, [params]);

  useEffect(() => {
    if (!courseId) { setSlots([]); return; }
    setSlotId("");
    api.get(`/demo-slots?course_id=${courseId}`).then((r) => setSlots(r.data)).catch(() => setSlots([]));
  }, [courseId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!courseId) return toast.error("Please select a course");
    if (!slotId) return toast.error("Please select a demo slot");
    if (!form.name.trim() || !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) return toast.error("Please enter a valid name and phone");
    if (!consent) return toast.error("Please accept the privacy notice");
    setLoading(true);
    try {
      const { data } = await api.post("/demo-bookings", { ...form, email: form.email || null, course_id: courseId, slot_id: slotId, consent: true });
      setSuccess(data);
      toast.success("Demo booked");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Seo title="Demo Booked" />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600"><CheckCircle2 className="h-9 w-9" /></div>
        <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">Demo class booked</h1>
        <p className="mt-3 text-slate-600">{success.message}</p>
        <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-8 py-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Booking reference</span>
          <span className="mt-1 font-mono text-xl font-bold text-slate-900" data-testid="demo-reference">{success.reference}</span>
          <span className="mt-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Status: {success.status}</span>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/courses">Browse courses</Link></Button>
          <Button asChild className="bg-teal-600 hover:bg-teal-700"><Link to="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Seo title="Book a Demo Class" description="Book a free demo class and experience our teaching first-hand." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Book a Demo Class</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Experience a class before you enrol. Choose a course and an available slot.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" data-testid="demo-form">
          <div className="space-y-1.5">
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger data-testid="demo-course-select"><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {courseId && (
            <div className="space-y-2">
              <Label>Available slots *</Label>
              {slots.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No demo slots are currently available for this course. Please check back later or submit an enquiry.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2" data-testid="demo-slots">
                  {slots.map((s) => {
                    const full = s.available <= 0;
                    return (
                      <button type="button" key={s.id} disabled={full} onClick={() => setSlotId(s.id)} data-testid={`demo-slot-${s.id}`}
                        className={cn("rounded-xl border p-4 text-left transition-colors", full ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60" : slotId === s.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-teal-300")}>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarDays className="h-4 w-4 text-teal-600" /> {formatDate(s.date)}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {s.time}</div>
                        <div className="mt-2 text-xs font-medium text-slate-500">{full ? "Fully booked" : `${s.available} seats left`}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="dname">Full name *</Label><Input id="dname" value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="demo-name-input" /></div>
            <div className="space-y-1.5"><Label htmlFor="dphone">Phone *</Label><Input id="dphone" value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="demo-phone-input" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="demail">Email (optional)</Label><Input id="demail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="demo-email-input" /></div>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <Checkbox id="dconsent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} data-testid="demo-consent-checkbox" className="mt-0.5" />
            <Label htmlFor="dconsent" className="text-sm font-normal leading-relaxed text-slate-600">I agree to be contacted about this demo booking and accept the <Link to="/privacy" className="text-teal-600 underline">privacy notice</Link>.</Label>
          </div>

          <Button type="submit" size="lg" className="bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="demo-submit-button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Demo Class"}
          </Button>
          <p className="text-xs text-slate-400">Bookings are pending confirmation until our team confirms your slot.</p>
        </form>
      </section>
    </div>
  );
}
