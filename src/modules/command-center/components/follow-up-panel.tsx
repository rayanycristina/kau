"use client";

import { motion } from "framer-motion";
import { BellRing, CheckCircle2, Clock3, PhoneCall } from "lucide-react";
import { followUps } from "@/data/alpha-sin-operation";
import { brl } from "@/lib/utils";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function FollowUpPanel() {
  return (
    <TacticalPanel glow="purple" className="col-span-4 h-[355px] p-4">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple"><BellRing size={20} /><h2 className="text-lg font-black uppercase">Follow-up Machine</h2></div>
          <p className="text-xs text-white/48">Fila inteligente · pressão de execução</p>
        </div>
        <button className="text-xs font-black text-purple">Ver fila completa</button>
      </header>
      <div className="mt-4 grid grid-cols-[128px_1fr] gap-4">
        <div className="relative grid h-[128px] place-items-center rounded-full border-[11px] border-purple/75 bg-purple/10 shadow-[0_0_36px_rgba(168,85,247,.25)]">
          <div className="spin-self absolute inset-[-15px] rounded-full border border-purple/15 border-t-purple/60" />
          <div className="text-center"><p className="text-4xl font-black">27</p><p className="text-[10px] uppercase text-white/55">ações hoje</p></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-sm font-black text-white">Radar de urgência</p>
          <div className="mt-3 space-y-1 text-sm">
            <p><span className="font-black text-danger">▲ 7</span> Críticos</p>
            <p><span className="font-black text-amber">● 12</span> Urgentes</p>
            <p><span className="font-black text-cyan">● 8</span> Importantes</p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {followUps.map((task) => (
          <motion.button key={task.id} whileHover={{ x: 3 }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-purple/35 hover:bg-purple/10">
            <div className={`grid h-9 w-9 place-items-center rounded-xl border ${task.state === "overdue" ? "border-danger/20 bg-danger/10 text-danger" : "border-money/20 bg-money/10 text-money"}`}>
              {task.state === "overdue" ? <PhoneCall size={15} /> : <CheckCircle2 size={15} />}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{task.title}</p><p className="truncate text-xs text-white/45">{task.context} · {brl(task.value)}</p></div>
            <span className={`text-xs font-black ${task.state === "overdue" ? "text-danger" : "text-money"}`}><Clock3 size={12} className="mr-1 inline" />{task.delay}</span>
          </motion.button>
        ))}
      </div>
    </TacticalPanel>
  );
}
