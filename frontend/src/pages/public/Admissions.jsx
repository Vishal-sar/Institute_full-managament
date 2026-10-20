import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg } from "@/lib/api";
import { Seo } from "@/components/common/Seo";

export default function Admissions() {
  const [params] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", course_id: "", preferred_batch: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get("/courses").then((r) => {
      setCourses(r.data);
      const pre = params.get("course");
      if (pre && r.data.some((c) => c.id === pre)) setForm((f) => ({ ...f, course_id: pre }));
    }).catch(() => {});
  }, [params]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your full name";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) e.phone = "Please enter a valid phone number";
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Please enter a valid email";
    if (!consent) e.consent = "Please accept the privacy notice";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, course_id: form.course_id || null, consent: true, source: "website" };
      const { data } = await api.post("/enquiries", payload);
      setSuccess(data);
      toast.success(data.duplicate ? "We already have your enquiry" : "Enquiry submitted successfully");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Seo title="Enquiry Received" />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600"><CheckCircle2 className="h-9 w-9" /></div>
        <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">Thank you!</h1>
        <p className="mt-3 text-slate-600">{success.message}</p>
        <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-8 py-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Your reference number</span>
          <span className="mt-1 font-mono text-xl font-bold text-slate-900" data-testid="enquiry-reference">{success.reference}</span>
        </div>
        <p className="mt-6 text-sm text-slate-500">Submitting an enquiry does not confirm admission. Our team will contact you shortly.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/courses">Browse courses</Link></Button>
          <Button asChild className="bg-teal-600 hover:bg-teal-700"><Link to="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Seo title="Admissions" description="Submit an admission enquiry and our team will get in touch." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Admission Enquiry</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Share a few details and our admissions team will reach out to guide you.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 sm:p-8" data-testid="enquiry-form" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="enquiry-name-input" />
              {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="enquiry-phone-input" />
              {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="enquiry-email-input" />
              {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Course of interest</Label>
              <Select value={form.course_id} onValueChange={(v) => set("course_id", v)}>
                <SelectTrigger data-testid="enquiry-course-select"><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref">Preferred batch / timing (optional)</Label>
            <Input id="pref" value={form.preferred_batch} onChange={(e) => set("preferred_batch", e.target.value)} placeholder="e.g. Weekend morning" data-testid="enquiry-batch-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg">Message (optional)</Label>
            <Textarea id="msg" rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} data-testid="enquiry-message-input" />
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} data-testid="enquiry-consent-checkbox" className="mt-0.5" />
            <Label htmlFor="consent" className="text-sm font-normal leading-relaxed text-slate-600">
              I consent to {`${""}`}being contacted about my enquiry and agree to the <Link to="/privacy" className="text-teal-600 underline">privacy notice</Link>. We collect only what's needed to respond.
            </Label>
          </div>
          {errors.consent && <p className="text-xs text-rose-600">{errors.consent}</p>}
          <Button type="submit" size="lg" className="bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="enquiry-submit-button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Enquiry"}
          </Button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900">What happens next?</h3>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /> Our admissions team contacts you to understand your goals.</li>
              <li className="flex gap-3"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /> We recommend suitable courses and batches.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /> Your information is kept private and used only to respond.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
            <p className="text-sm text-teal-800">Prefer to try before you enrol? <Link to="/demo" className="font-semibold underline">Book a free demo class</Link>.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
