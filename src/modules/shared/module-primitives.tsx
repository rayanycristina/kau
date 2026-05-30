"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, ArrowUpRight, BrainCircuit, Radio, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";

export function ModuleHero({ eyebrow, title, description, metric, accent = "cyan", icon: Icon = BrainCircuit }: { eyebrow: string; title: string; description: string; metric: string; accent?: "cyan" | "money" | "danger" | "purple" | "amber"; icon?: LucideIcon }) {
  const text = { cyan: "text-cyan", money: "text-money", danger: "text-danger", purple: "text-purple", amber: "text-amber" }[accent];
  const border = { cyan: "border-cyan/25 bg-cyan/10", money: "border-money/25 bg-money/10", danger: "border-danger/25 bg-danger/10", purple: "border-purple/25 bg-purple/10", amber: "border-amber/25 bg-amber/10" }[accent];
  return (
    <TacticalPanel className="relative min-h-[220px] overflow-hidden p-6">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full border border-cyan/10 bg-cyan/5 blur-sm" />
      <div className="spin-self absolute right-12 top-10 h-32 w-32 rounded-full border border-white/10 border-t-cyan/60" />
      <div className="grid grid-cols-[1fr_260px] gap-6">
        <div>
          <p className={cn("text-xs font-black uppercase tracking-[.22em]", text)}>{eyebrow}</p>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-tight">{title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/62">{description}</p>
          <div className="mt-6 flex gap-3">
            <ActionButton variant="cyan">Executar modo tático</ActionButton>
            <ActionButton variant="ghost">Abrir análise profunda</ActionButton>
          </div>
        </div>
        <div className={cn("relative grid place-items-center rounded-[24px] border", border)}>
          <div className="ai-core-pulse absolute inset-5 rounded-full bg-current blur-2xl" />
          <Icon className={cn("relative z-10 h-16 w-16", text)} />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-center backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">Pulso operacional</p>
            <p className={cn("mt-1 text-2xl font-black", text)}>{metric}</p>
          </div>
        </div>
      </div>
    </TacticalPanel>
  );
}

export function MetricTile({ label, value, delta, tone = "money" }: { label: string; value: string; delta: string; tone?: "money" | "danger" | "cyan" | "purple" | "amber" }) {
  const color = { money: "text-money", danger: "text-danger", cyan: "text-cyan", purple: "text-purple", amber: "text-amber" }[tone];
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-panel">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/38">{label}</p>
      <p className={cn("mt-2 text-3xl font-black", color)}>{value}</p>
      <p className="mt-1 text-xs text-white/48">{delta}</p>
    </motion.div>
  );
}

export function IntelligenceCard({ title, description, icon: Icon = Sparkles, tone = "cyan" }: { title: string; description: string; icon?: LucideIcon; tone?: "cyan" | "money" | "danger" | "purple" | "amber" }) {
  const cls = { cyan: "border-cyan/20 bg-cyan/10 text-cyan", money: "border-money/20 bg-money/10 text-money", danger: "border-danger/20 bg-danger/10 text-danger", purple: "border-purple/20 bg-purple/10 text-purple", amber: "border-amber/20 bg-amber/10 text-amber" }[tone];
  return (
    <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: .985 }} className={cn("w-full rounded-2xl border p-4 text-left", cls)}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-current/20 bg-black/20"><Icon size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/58">{description}</p>
        </div>
        <ArrowUpRight size={17} />
      </div>
    </motion.button>
  );
}

export function Waveform({ tone = "money", bars = 22 }: { tone?: "money" | "cyan" | "danger" | "purple" | "amber"; bars?: number }) {
  const bg = { money: "bg-money", cyan: "bg-cyan", danger: "bg-danger", purple: "bg-purple", amber: "bg-amber" }[tone];
  return (
    <div className="flex h-16 items-center gap-1.5 overflow-hidden rounded-2xl border border-white/10 bg-black/25 px-4">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn("wave-bar w-1.5 rounded-full opacity-80 shadow-glowGreen", bg)}
          style={{ height: `${45 + ((i * 11) % 46)}%`, animationDuration: `${0.8 + (i % 5) * 0.14}s`, animationDelay: `${i * 0.025}s` }}
        />
      ))}
    </div>
  );
}

export function QueueRow({ title, meta, value, tone = "danger", icon: Icon = ShieldAlert }: { title: string; meta: string; value: string; tone?: "danger" | "money" | "cyan" | "purple" | "amber"; icon?: LucideIcon }) {
  const color = { danger: "text-danger border-danger/20 bg-danger/10", money: "text-money border-money/20 bg-money/10", cyan: "text-cyan border-cyan/20 bg-cyan/10", purple: "text-purple border-purple/20 bg-purple/10", amber: "text-amber border-amber/20 bg-amber/10" }[tone];
  return (
    <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3">
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl border", color)}><Icon size={17} /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{title}</p><p className="truncate text-xs text-white/45">{meta}</p></div>
      <p className={cn("text-sm font-black", color.split(' ')[0])}>{value}</p>
    </motion.div>
  );
}

export function LiveChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-money/20 bg-money/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-money"><Radio size={12} /><span className="h-1.5 w-1.5 rounded-full bg-money shadow-glowGreen" />{children}</span>;
}

export function ReactorRing({ value, label, tone = "cyan" }: { value: string; label: string; tone?: "cyan" | "money" | "danger" | "purple" | "amber" }) {
  const color = { cyan: "text-cyan border-cyan/25 bg-cyan/10", money: "text-money border-money/25 bg-money/10", danger: "text-danger border-danger/25 bg-danger/10", purple: "text-purple border-purple/25 bg-purple/10", amber: "text-amber border-amber/25 bg-amber/10" }[tone];
  return (
    <div className={cn("relative grid h-44 place-items-center rounded-full border", color)}>
      <div className="spin-self absolute inset-[-8px] rounded-full border border-current/20 border-t-current/80" />
      <Zap className="absolute top-7 h-5 w-5" />
      <div className="text-center"><p className="text-4xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.16em] text-white/45">{label}</p></div>
    </div>
  );
}

export function ScreenGrid({ children }: { children: ReactNode }) {
  return <div className="mt-4 grid grid-cols-12 gap-4">{children}</div>;
}

export { Activity };
