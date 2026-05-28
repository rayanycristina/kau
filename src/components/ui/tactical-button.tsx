"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TacticalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: "money" | "cyan" | "amber" | "danger" | "purple" | "neutral";
  className?: string;
};

const toneClass = {
  money: "border-money/35 bg-money/10 text-money shadow-glowGreen hover:bg-money/15",
  cyan: "border-cyan/35 bg-cyan/10 text-cyan shadow-glowCyan hover:bg-cyan/15",
  amber: "border-amber/35 bg-amber/10 text-amber hover:bg-amber/15",
  danger: "border-danger/35 bg-danger/10 text-danger shadow-glowRed hover:bg-danger/15",
  purple: "border-purple/35 bg-purple/10 text-purple hover:bg-purple/15",
  neutral: "border-white/10 bg-white/[.045] text-white/72 hover:bg-white/[.07]"
};

export function TacticalButton({ children, icon: Icon, tone = "neutral", className, type = "button", ...props }: TacticalButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.975 }}
      className={cn(
        "group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-3 text-sm font-black transition duration-300 disabled:cursor-not-allowed disabled:opacity-45",
        toneClass[tone],
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
      {Icon ? <Icon size={16} /> : null}
      <span className="relative">{children}</span>
    </motion.button>
  );
}
