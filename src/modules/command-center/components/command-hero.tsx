"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Flame } from "lucide-react";
import { activeOpportunities, revenueAtRisk, teamConversion } from "@/data/alpha-sin-operation";
import { brl } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { RevenueReactor } from "./revenue-reactor";

export function CommandHero() {
  return (
    <section className="grid grid-cols-12 gap-4">
      <TacticalPanel glow="red" className="col-span-3 h-[206px] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.15em] text-danger">Receita em risco</p>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-4xl font-black danger-text">
              {brl(revenueAtRisk)}
            </motion.p>
          </div>
          <div className="critical-pulse rounded-2xl border border-danger/20 bg-danger/10 p-3 text-danger shadow-glowRed">
            <AlertTriangle size={20} />
          </div>
        </div>
        <p className="mt-2 text-sm text-white/60"><span className="font-black text-danger">▲ 23%</span> vs ontem · dinheiro esfriando</p>
        <div className="mt-4"><Sparkline tone="danger" data={[28,32,37,35,48,42,72,44,53,31,49,56,51,62,58]} /></div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-danger/15 bg-danger/10 px-3 py-2 text-xs">
          <span className="text-white/58">Perda provável</span>
          <span className="font-black text-danger">23min</span>
        </div>
      </TacticalPanel>

      <div className="col-span-6"><RevenueReactor /></div>

      <TacticalPanel glow="cyan" className="col-span-3 h-[206px] overflow-hidden p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.15em] text-cyan">Oportunidades ativas</p>
            <p className="mt-4 text-4xl font-black">{activeOpportunities}</p>
          </div>
          <div className="rounded-2xl border border-money/20 bg-money/10 p-3 text-money"><ArrowUpRight size={20} /></div>
        </div>
        <p className="mt-2 text-sm text-white/60"><span className="font-black text-money">▲ 12%</span> vs ontem · 17 quentes</p>
        <div className="mt-4 grid grid-cols-[1fr_86px] gap-4">
          <div className="min-w-0"><Sparkline tone="money" data={[18,25,21,32,29,48,40,61,55,72,68,84]} /></div>
          <div className="relative grid h-[86px] w-[86px] place-items-center rounded-full border-[9px] border-purple/75 bg-purple/10 text-xl font-black shadow-[0_0_34px_rgba(168,85,247,.25)]">
            <span>{teamConversion}%</span>
            <span className="absolute -bottom-2 rounded-full border border-purple/20 bg-black/70 px-2 py-0.5 text-[9px] text-purple">conversão</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber/20 bg-amber/10 px-3 py-2 text-xs text-amber"><Flame size={13} /> 3 leads muito quentes sem ligação</div>
      </TacticalPanel>
    </section>
  );
}
