import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, Clock3, BookOpen, Boxes, CalendarCheck, Wallet, TrendingUp, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { api, formatCurrency } from "@/lib/api";
import { StatCard } from "@/components/common/StatCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";
import { EmptyState } from "@/components/common/EmptyState";

const PIE_COLORS = ["#0d9488", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#64748b"];
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(m) {
  if (!m) return m;
  const parts = m.split("-");
  return `${MONTHS[parseInt(parts[1], 10)]} ${parts[0].slice(2)}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setData(r.data)).catch(() => setData(false));
  }, []);

  if (data === null) return <Loader full />;
  if (data === false) return <EmptyState title="Could not load dashboard" />;

  const m = data.metrics;
  const fees = (data.charts.fees_by_month || []).map((x) => ({ ...x, label: monthLabel(x.month) }));
  const enquiry = data.charts.enquiry_status || [];
  const byCourse = data.charts.students_by_course || [];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Live overview of your institute — all figures are from saved records." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Students" value={m.active_students} icon={Users} accent="teal" testid="metric-active-students" />
        <StatCard label="New Enquiries" value={m.new_enquiries} icon={UserPlus} accent="blue" testid="metric-new-enquiries" />
        <StatCard label="Pending Follow-ups" value={m.pending_followups} icon={Clock3} accent="amber" testid="metric-pending-followups" />
        <StatCard label="Active Courses" value={m.active_courses} icon={BookOpen} accent="navy" testid="metric-active-courses" />
        <StatCard label="Active Batches" value={m.active_batches} icon={Boxes} accent="navy" testid="metric-active-batches" />
        <StatCard label="Today's Classes" value={m.todays_classes} icon={CalendarCheck} accent="teal" testid="metric-todays-classes" />
        <StatCard label="Fees Collected (Month)" value={formatCurrency(m.fees_collected_month)} icon={TrendingUp} accent="green" testid="metric-fees-month" />
        <StatCard label="Outstanding Fees" value={formatCurrency(m.outstanding)} icon={Wallet} accent="rose" testid="metric-outstanding" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-slate-900">Fees collected (last 6 months)</h3>
          <div className="mt-4 h-72">
            {fees.length === 0 ? <EmptyState title="No payments recorded yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fees} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="feeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2.5} fill="url(#feeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold text-slate-900">Enquiries by status</h3>
          <div className="mt-4 h-72">
            {enquiry.length === 0 ? <EmptyState title="No enquiries yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={enquiry} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {enquiry.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} formatter={(v, n) => [v, String(n).replace(/_/g, " ")]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {enquiry.map((e, i) => (
              <span key={e.status} className="inline-flex items-center gap-1.5 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {e.status.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-slate-900">Students by course</h3>
          <div className="mt-4 h-64">
            {byCourse.length === 0 ? <EmptyState title="No students yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCourse} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="course" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-teal-600" /><h3 className="font-display text-base font-semibold text-slate-900">Recent activity</h3></div>
          <div className="mt-4 space-y-3">
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : data.recent_activity.map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                <div>
                  <p className="text-sm text-slate-700">{a.details}</p>
                  <p className="text-xs text-slate-400">{a.actor_name} · {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900">Today's scheduled classes</h3>
          <Link to="/admin/attendance" className="text-sm font-medium text-teal-600 hover:text-teal-700">Mark attendance →</Link>
        </div>
        {data.todays_classes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No classes scheduled for today.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.todays_classes.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.course}</p>
                <p className="mt-2 text-xs text-slate-500">{c.start_time}–{c.end_time} · {c.location}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
