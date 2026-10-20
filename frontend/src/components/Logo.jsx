import { GraduationCap } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { cn } from "@/lib/utils";

export function Logo({ className, mark = true, light = false }) {
  const { settings } = useSettings();
  if (settings?.logo_url) {
    return <img src={settings.logo_url} alt={settings.name} className={cn("h-9 w-auto", className)} />;
  }
  return (
    <div className={cn("flex items-center gap-2.5", className)} data-testid="brand-logo">
      {mark && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
      )}
      <span className={cn("font-display text-lg font-extrabold tracking-tight", light ? "text-white" : "text-slate-900")}>
        {settings?.name || "EduPrime Academy"}
      </span>
    </div>
  );
}
