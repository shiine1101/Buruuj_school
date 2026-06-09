import { Bus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex w-full flex-col items-center gap-3 py-1", compact && "flex-row justify-start gap-3 py-0", className)}>
      <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-sky-500 text-white shadow-soft ring-4 ring-sky-50 dark:ring-sky-950/40">
        <span className="text-[2.15rem] font-black leading-none">B</span>
        <Bus className="absolute -bottom-1 -right-1 h-5 w-5 rounded bg-white p-0.5 text-slate-900 shadow-sm" />
      </div>
      <div className={cn("space-y-1 text-center", compact && "space-y-0.5 text-left")}>
        <div className="text-[1.45rem] font-black leading-none tracking-[0.14em] text-slate-950 dark:text-white">BURUUJ</div>
        <div className="text-[0.7rem] font-bold tracking-[0.24em] text-sky-500">SCHOOL BUS</div>
        <div className="text-[8px] font-semibold tracking-[0.28em] text-slate-500 dark:text-slate-400">MANAGEMENT SYSTEM</div>
      </div>
    </div>
  );
}
