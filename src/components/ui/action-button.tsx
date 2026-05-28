"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  money: "border-money/30 bg-money/10 text-money shadow-glowGreen hover:bg-money/15",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan shadow-glowCyan hover:bg-cyan/15",
  danger: "border-danger/30 bg-danger/10 text-danger shadow-glowRed hover:bg-danger/15",
  purple: "border-purple/30 bg-purple/10 text-purple hover:bg-purple/15",
  ghost: "border-white/10 bg-white/[.035] text-white/80 hover:bg-white/[.07]"
};

export function ActionButton({ children, className, variant = "ghost" }: { children: ReactNode; className?: string; variant?: keyof typeof variants }) {
  return <motion.button whileHover={{ y: -2, scale: 1.015 }} whileTap={{ scale: .97 }} className={cn("rounded-xl border px-4 py-3 text-sm font-bold transition", variants[variant], className)}>{children}</motion.button>;
}
