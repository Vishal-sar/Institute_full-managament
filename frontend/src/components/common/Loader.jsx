import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loader({ full = false, label = "Loading…", className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-slate-500",
        full ? "min-h-[60vh] w-full" : "py-16",
        className
      )}
      data-testid="loader"
    >
      <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
