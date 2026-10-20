import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, Users, CalendarDays, Megaphone, Save, Loader2, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, errMsg, formatDate } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "present", label: "Present", cls: "bg-emerald-600 text-white" },
  { value: "absent", label: "Absent", cls: "bg-rose-600 text-white" },
  { value: "late", label: "Late", cls: "bg-amber-500 text-white" },
  { value: "excused", label: "Excused", cls: "bg-blue-600 text-white" },
];
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function FacultyPortal() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null); // batch for attendance
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ bio: "", languages: "" });

  const load = () => api.get("/portal/faculty/overview").then((r) => {
    setData(r.data);
    setProfile({ bio: r.data.faculty.bio || "", languages: (r.data.faculty.languages || []).join(", ") });
  }).catch((e) => { setData(false); toast.error(errMsg(e)); });

  useEffect(() => { load(); }, []);

  const openRoster = async (batch, d = date) => {
    setActive(batch); setRoster(null); setDate(d);
    try {
      const { data } = await api.get(`/portal/faculty/batches/${batch.id}/roster?session_date=${d}`);
      setRoster(data.roster.map((r) => ({ ...r, status: r.status || "present" })));
    } catch (e) { toast.error(errMsg(e)); }
  };
  const setStatus = (sid, status) => setRoster((r) => r.map((x) => (x.student_id === sid ? { ...x, status } : x)));
  const save = async () => {
    setSaving(true);
    try { const { data } = await api.post("/portal/faculty/attendance", { batch_id: active.id, session_date: date, entries: roster.map((r) => ({ student_id: r.student_id, status: r.status })) }); toast.success(`Saved for ${data.saved} students`); } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  const saveProfile = async () => {
    try { await api.put("/portal/faculty/profile", { bio: profile.bio, languages: profile.languages.split(",").map((x) => x.trim()).filter(Boolean) }); toast.success("Profile updated"); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (data === null) return <PortalShell title="Faculty"><Loader full /></PortalShell>;
  if (data === false) return <PortalShell title="Faculty"><EmptyState title="No faculty profile linked" description="Your account is not linked to a faculty profile. Please contact the institute." /></PortalShell>;

  const { faculty, batches, announcements } = data;

  if (active) {
    return (
      <PortalShell title="Faculty Portal">
        <Button variant="ghost" className="mb-4 text-slate-600" onClick={() => { setActive(null); setRoster(null); }}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to batches</Button>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-display text-lg font-bold text-slate-900">{active.name}</h2><p className="text-sm text-slate-500">{active.course_title}</p></div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => openRoster(active, e.target.value)} data-testid="faculty-attendance-date" /></div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={save} disabled={saving || !roster} data-testid="faculty-attendance-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save</>}</Button>
          </div>
        </div>
        {roster === null ? <Loader /> : roster.length === 0 ? <EmptyState title="No active students in this batch" /> : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="faculty-roster">
            {roster.map((r, i) => (
              <div key={r.student_id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between", i > 0 && "border-t border-slate-100")}>
                <div><p className="font-medium text-slate-900">{r.name}</p><p className="font-mono text-xs text-slate-400">{r.student_code}</p></div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => <button key={s.value} onClick={() => setStatus(r.student_id, s.value)} data-testid={`faculty-att-${r.student_code}-${s.value}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", r.status === s.value ? s.cls + " border-transparent" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}>{s.label}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Faculty Portal">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Welcome, {faculty.name}</h1>
        <p className="text-sm text-slate-500">{(faculty.subjects || []).join(", ")}</p>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="My Batches" value={batches.length} icon={Boxes} accent="teal" />
        <StatCard label="Classes Today" value={batches.filter((b) => b.today).length} icon={CalendarDays} accent="blue" />
        <StatCard label="Students" value={batches.reduce((a, b) => a + (b.enrolled_count || 0), 0)} icon={Users} accent="navy" />
      </div>

      <Tabs defaultValue="batches">
        <TabsList><TabsTrigger value="batches">My Batches</TabsTrigger><TabsTrigger value="announcements">Announcements</TabsTrigger><TabsTrigger value="profile">Profile</TabsTrigger></TabsList>

        <TabsContent value="batches">
          {batches.length === 0 ? <EmptyState title="No batches assigned" icon={Boxes} /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="faculty-batches">
              {batches.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{b.mode}</span>
                    {b.today && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Today</span>}
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">{b.name}</h3>
                  <p className="text-sm text-slate-500">{b.course_title}</p>
                  <p className="mt-2 text-xs text-slate-400">{(b.days || []).map((d) => d.slice(0, 3)).join(", ")} · {b.start_time}–{b.end_time}</p>
                  <p className="mt-1 text-xs text-slate-400">{b.enrolled_count} students</p>
                  <Button size="sm" className="mt-4 w-full bg-teal-600 hover:bg-teal-700" onClick={() => openRoster(b)} data-testid={`mark-attendance-${b.code}`}>Mark Attendance</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {announcements.length === 0 ? <p className="text-sm text-slate-400">No announcements.</p> : (
              <div className="space-y-3">{announcements.map((a) => <div key={a.id} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex items-center gap-2 text-teal-600"><Megaphone className="h-4 w-4" /><span className="text-xs font-semibold uppercase">{formatDate(a.publish_date)}</span></div><p className="mt-1 text-sm font-semibold text-slate-800">{a.title}</p><p className="text-sm text-slate-600">{a.body}</p></div>)}</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-semibold text-slate-900">Update profile</h3>
            <div className="space-y-1.5"><Label>Biography</Label><Textarea rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} data-testid="faculty-bio-input" /></div>
            <div className="space-y-1.5"><Label>Languages (comma-separated)</Label><Input value={profile.languages} onChange={(e) => setProfile({ ...profile, languages: e.target.value })} /></div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveProfile} data-testid="faculty-profile-save">Save Profile</Button>
          </div>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}
