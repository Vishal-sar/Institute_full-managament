import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, formatCurrency } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

export default function Fees() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/fees/overview").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  if (data === null) return <Loader full />;
  const s = data.summary;

  return (
    <div className="space-y-6">
      <PageHeader title="Fees & Payments" description="Financial ledger across all students. Outstanding is computed from obligations minus valid payments." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Billed" value={formatCurrency(s.total)} icon={Wallet} accent="navy" testid="fees-total" />
        <StatCard label="Collected" value={formatCurrency(s.paid)} icon={TrendingUp} accent="green" testid="fees-collected" />
        <StatCard label="Outstanding" value={formatCurrency(s.outstanding)} icon={AlertCircle} accent="rose" testid="fees-outstanding" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Student balances</div>
        {data.students.length === 0 ? <EmptyState title="No fee records yet" icon={Wallet} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="fees-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Code</TableHead><TableHead>Student</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.students.map((r) => (
                  <TableRow key={r.student_id} className="cursor-pointer" onClick={() => navigate(`/admin/students/${r.student_id}`)} data-testid={`fees-row-${r.student_code}`}>
                    <TableCell className="font-mono text-xs text-slate-500">{r.student_code}</TableCell>
                    <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                    <TableCell>{formatCurrency(r.total)}</TableCell>
                    <TableCell className="text-emerald-700">{formatCurrency(r.paid)}</TableCell>
                    <TableCell className={r.outstanding > 0 ? "font-medium text-rose-600" : "text-slate-500"}>{formatCurrency(r.outstanding)}</TableCell>
                    <TableCell><StatusBadge status={r.outstanding <= 0 ? "paid" : r.paid > 0 ? "partial" : "due"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
