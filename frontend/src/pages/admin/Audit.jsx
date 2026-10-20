import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

const PAGE = 50;

export default function Audit() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/admin/audit?skip=${page * PAGE}&limit=${PAGE}`); setData(data); } catch (e) { toast.error(errMsg(e)); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const total = data?.total || 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit History" description="A record of important administrative and financial changes." />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {data === null ? <Loader /> : data.items.length === 0 ? <EmptyState title="No audit records yet" icon={History} /> : (
          <div className="overflow-x-auto">
            <Table data-testid="audit-table">
              <TableHeader className="bg-slate-50"><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                    <TableCell className="text-slate-700">{a.actor_name}<span className="ml-1 text-xs text-slate-400">({a.actor_role})</span></TableCell>
                    <TableCell><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{a.action}</span></TableCell>
                    <TableCell className="text-slate-600">{a.entity_type}</TableCell>
                    <TableCell className="text-slate-600">{a.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page + 1} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
