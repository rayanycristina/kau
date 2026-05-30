import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  live: "border-money/25 bg-money/10 text-money",
  danger: "border-danger/25 bg-danger/10 text-danger",
  cyan: "border-cyan/25 bg-cyan/10 text-cyan"
};

export function StatusPill({ children, variant = "live", pulse = false }: { children: ReactNode; variant?: keyof typeof variants; pulse?: boolean }) {
  return <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[.14em]", variants[variant])}>{pulse && <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}{children}</span>;
}
