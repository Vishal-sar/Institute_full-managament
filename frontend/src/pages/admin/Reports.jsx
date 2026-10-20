import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { api, errMsg, formatCurrency } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Loader } from "@/components/common/Loader";
import { TrendingUp, Target, Percent, Users } from "lucide-react";

const COLORS = ["#0d9488", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function Reports() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    try { const { data } = await api.get(`/admin/reports?${params}`); setData(data); } catch (e) { toast.error(errMsg(e)); }
  }, [start, end]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Operational insights derived from saved records. Use a date range to scope results." />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} data-testid="report-start" /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="report-end" /></div>
        <Button variant="outline" onClick={() => { setStart(""); setEnd(""); }}>Clear</Button>
      </div>

      {data === null ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Enquiries" value={data.enquiries.total} icon={Users} accent="blue" testid="report-enquiries" />
            <StatCard label="Converted" value={data.enquiries.converted} icon={Target} accent="teal" testid="report-converted" />
            <StatCard label="Conversion Rate" value={`${data.enquiries.conversion_rate}%`} icon={Percent} accent="green" testid="report-conversion-rate" />
            <StatCard label="Fees Collected" value={formatCurrency(data.fees.collected)} icon={TrendingUp} accent="navy" testid="report-collected" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-semibold text-slate-900">Enquiries by source</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.enquiries.by_source} margin={{ left: -10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>{data.enquiries.by_source.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-semibold text-slate-900">Payments by method</h3>
              {data.fees.by_method.length === 0 ? <p className="mt-6 text-sm text-slate-400">No payments in this range.</p> : (
                <div className="mt-4 space-y-3">
                  {data.fees.by_method.map((m, i) => {
                    const max = Math.max(...data.fees.by_method.map((x) => x.amount));
                    return (
                      <div key={m.method}>
                        <div className="flex justify-between text-sm"><span className="capitalize text-slate-600">{m.method.replace(/_/g, " ")}</span><span className="font-medium">{formatCurrency(m.amount)}</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${(m.amount / max) * 100}%`, background: COLORS[i % COLORS.length] }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                Attendance: <b>{data.attendance.rate}%</b> present across <b>{data.attendance.records}</b> records.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
