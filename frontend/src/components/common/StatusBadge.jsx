import { cn } from "@/lib/utils";

const MAP = {
  // generic
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  // enquiry
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  follow_up: "bg-amber-50 text-amber-700 border-amber-200",
  demo_scheduled: "bg-violet-50 text-violet-700 border-violet-200",
  interested: "bg-teal-50 text-teal-700 border-teal-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_interested: "bg-rose-50 text-rose-700 border-rose-200",
  // fees / payment
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  due: "bg-slate-100 text-slate-600 border-slate-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  reversed: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  // attendance
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  absent: "bg-rose-50 text-rose-700 border-rose-200",
  late: "bg-amber-50 text-amber-700 border-amber-200",
  excused: "bg-blue-50 text-blue-700 border-blue-200",
  // demo
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export function StatusBadge({ status, className }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const label = String(status).replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        MAP[status] || "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      {label}
    </span>
  );
}
