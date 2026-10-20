import { cn } from "@/lib/utils";

export function StatCard({ label, value, icon: Icon, accent = "teal", hint, testid }) {
  const accents = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    navy: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    green: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accents[accent])}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
