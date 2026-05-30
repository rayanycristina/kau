"use client";

import { motion } from "framer-motion";
import { Brain, PhoneCall, ShieldAlert, TimerReset } from "lucide-react";
import { brl } from "@/lib/utils";

const priorities = [
  { icon: PhoneCall, title: "Ligar Maria Silva", meta: "Lead quente · AlphaSin · 87% calor", impact: 12500, tone: "money" },
  { icon: ShieldAlert, title: "Recuperar COD parado", meta: "Confirmação pendente · 41min", impact: 3980, tone: "danger" },
  { icon: TimerReset, title: "Quebrar fila atrasada", meta: "7 follow-ups críticos", impact: 4250, tone: "amber" }
];

const toneClass = {
  money: "border-money/25 bg-money/10 text-money",
  danger: "border-danger/25 bg-danger/10 text-danger",
  amber: "border-amber/25 bg-amber/10 text-amber"
};

export function MissionPriorityStrip() {
  return (
    <section className="mt-4 grid grid-cols-3 gap-4">
      {priorities.map((priority, index) => (
        <motion.button
          key={priority.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          whileHover={{ y: -3, scale: 1.008 }}
          whileTap={{ scale: 0.985 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left shadow-panel backdrop-blur-xl"
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan via-money to-purple opacity-60" />
          <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
          <div className="relative flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl border ${toneClass[priority.tone as keyof typeof toneClass]}`}>
              <priority.icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan"><Brain size={12} /> IA recomenda agora</div>
              <p className="mt-1 truncate text-sm font-black text-white">{priority.title}</p>
              <p className="truncate text-xs text-white/48">{priority.meta}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-white/40">impacto</p>
              <p className="text-sm font-black text-money">{brl(priority.impact)}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </section>
  );
}
