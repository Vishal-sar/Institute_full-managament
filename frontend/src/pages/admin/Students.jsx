import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Download, Eye, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, API } from "@/lib/api";
import { useLookups } from "@/lib/useLookups";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";

const PAGE = 20;
const emptyForm = { name: "", phone: "", email: "", course_id: "", batch_id: "", admission_date: "", fee_total: "", notes: "", create_login: false, password: "" };

export default function Students() {
  const navigate = useNavigate();
  const lookups = useLookups();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ skip: page * PAGE, limit: PAGE });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (courseFilter !== "all") params.set("course_id", courseFilter);
    try {
      const { data } = await api.get(`/admin/students?${params}`);
      setData(data);
    } catch (e) { toast.error(errMsg(e)); }
  }, [page, search, status, courseFilter]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const batchesForCourse = lookups.batches.filter((b) => b.course_id === form.course_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    setSaving(true);
    try {
      await api.post("/admin/students", {
        ...form,
        email: form.email || null,
        course_id: form.course_id || null,
        batch_id: form.batch_id || null,
        fee_total: form.fee_total === "" ? null : Number(form.fee_total),
        admission_date: form.admission_date || null,
      });
      toast.success("Student registered");
      setOpen(false); setForm(emptyForm); setPage(0); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const total = data?.total || 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-6">
      <PageHeader title="Students" description={`${total} student record${total === 1 ? "" : "s"}`}>
        <Button variant="outline" asChild data-testid="students-export-btn">
          <a href={`${API}/admin/students/export`}><Download className="mr-1.5 h-4 w-4" /> Export CSV</a>
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-student-btn"><Plus className="mr-1.5 h-4 w-4" /> Add Student</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="add-student-dialog">
            <DialogHeader><DialogTitle>Register a student</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Full name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="student-name-input" /></div>
                <div className="space-y-1.5"><Label>Phone *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="student-phone-input" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="student-email-input" /></div>
                <div className="space-y-1.5"><Label>Admission date</Label><Input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={(v) => { set("course_id", v); set("batch_id", ""); }}>
                    <SelectTrigger data-testid="student-course-select"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Select value={form.batch_id} onValueChange={(v) => set("batch_id", v)} disabled={!form.course_id}>
                    <SelectTrigger data-testid="student-batch-select"><SelectValue placeholder={form.course_id ? "Select batch" : "Pick course first"} /></SelectTrigger>
                    <SelectContent>{batchesForCourse.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Total course fee (optional — defaults to course fee)</Label><Input type="number" value={form.fee_total} onChange={(e) => set("fee_total", e.target.value)} placeholder="e.g. 45000" /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                <Checkbox id="clogin" checked={form.create_login} onCheckedChange={(v) => set("create_login", !!v)} data-testid="student-login-checkbox" />
                <Label htmlFor="clogin" className="text-sm font-normal">Create a student portal login (requires email)</Label>
              </div>
              {form.create_login && <div className="space-y-1.5"><Label>Temporary password</Label><Input value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Student@123" /></div>}
              <DialogFooter>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="student-save-btn">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Student"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder="Search by name, phone or code…" className="pl-9" data-testid="students-search" />
        </div>
        <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
          <SelectTrigger className="w-full sm:w-40" data-testid="students-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={(v) => { setPage(0); setCourseFilter(v); }}>
          <SelectTrigger className="w-full sm:w-52" data-testid="students-course-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All courses</SelectItem>{lookups.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {data === null ? <Loader /> : data.items.length === 0 ? (
          <EmptyState title="No students found" icon={Users} description="Register a student or adjust your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="students-table">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                  <TableHead>Course</TableHead><TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/admin/students/${s.id}`)} data-testid={`student-row-${s.student_code}`}>
                    <TableCell className="font-mono text-xs text-slate-500">{s.student_code}</TableCell>
                    <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                    <TableCell className="text-slate-600">{s.phone}</TableCell>
                    <TableCell className="text-slate-600">{s.course_title || "—"}</TableCell>
                    <TableCell className="text-slate-600">{s.batch_name || "—"}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/students/${s.id}`); }}><Eye className="h-4 w-4" /></Button></TableCell>
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
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} data-testid="students-prev"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} data-testid="students-next"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
