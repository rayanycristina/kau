import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function TacticalPanel({ className, children, glow = "none" }: { className?: string; children: ReactNode; glow?: "green" | "cyan" | "red" | "purple" | "none" }) {
  const glowClass = {
    green: "shadow-glowGreen border-money/25",
    cyan: "shadow-glowCyan border-cyan/25",
    red: "shadow-glowRed border-danger/25",
    purple: "shadow-[0_0_36px_rgba(168,85,247,.22)] border-purple/25",
    none: ""
  }[glow];
  return <section className={cn("tactical-panel rounded-[22px]", glowClass, className)}>{children}</section>;
}
