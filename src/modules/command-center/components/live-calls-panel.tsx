"use client";

import { motion } from "framer-motion";
import { Activity, Ear, PhoneCall, Radio } from "lucide-react";
import { liveCalls } from "@/data/alpha-sin-operation";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { Sparkline } from "@/components/charts/sparkline";
import { TacticalButton } from "@/components/ui/tactical-button";

export function LiveCallsPanel() {
  return (
    <TacticalPanel glow="green" className="col-span-4 h-[355px] p-4">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-money"><PhoneCall size={20} /><h2 className="text-lg font-black uppercase">Live Calls</h2></div>
          <p className="text-xs text-white/48">3 chamadas ao vivo · escuta operacional ativa</p>
        </div>
        <div className="animate-breathe flex items-center gap-2 rounded-full border border-danger/25 bg-danger/10 px-3 py-1 text-[10px] font-black uppercase text-danger">
          <Radio size={12} /> Ao vivo
        </div>
      </header>
      <div className="mt-4 space-y-3">
        {liveCalls.map((call, index) => (
          <motion.div key={call.id} whileHover={{ x: 3, scale: 1.006 }} className="group rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-money/25 hover:bg-money/[.045]">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-money/16 text-xs font-black text-money shadow-glowGreen">{call.sellerName.slice(0, 1)}{call.leadName.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-black">{call.leadName}</p>
                  <span className="font-mono text-xs text-white/60">{call.duration}</span>
                </div>
                <p className="truncate text-xs text-white/46">{call.sentiment} · Produto: {call.product}</p>
                <div className="mt-2"><Sparkline tone={call.heat > 8 ? "money" : "amber"} data={call.spark} /></div>
              </div>
              <div className="grid h-[58px] w-[58px] place-items-center rounded-xl border border-money/20 bg-money/10 text-center">
                <p className="text-xl font-black text-money">{call.heat}</p>
                <p className="-mt-2 text-[9px] font-bold uppercase text-money/70">heat</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-lg border border-cyan/15 bg-cyan/10 px-2 py-1 text-[10px] text-cyan"><Ear size={11} className="mr-1 inline" />Escutar</span>
              <span className="rounded-lg border border-purple/15 bg-purple/10 px-2 py-1 text-[10px] text-purple">Objeção: preço</span>
              <span className="rounded-lg border border-money/15 bg-money/10 px-2 py-1 text-[10px] text-money">Fechamento: alto</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <TacticalButton tone="money" icon={Activity} className="flex-1 py-2.5">Entrar na sala de monitoria</TacticalButton>
      </div>
    </TacticalPanel>
  );
}
