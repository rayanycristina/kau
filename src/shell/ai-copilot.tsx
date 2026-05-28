"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, CircleDollarSign, PhoneCall, Sparkles, TimerReset } from "lucide-react";
import { TacticalButton } from "@/components/ui/tactical-button";

const alerts = [
  { icon: TimerReset, label: "7 follow-ups críticos", action: "Ação necessária", tone: "danger" },
  { icon: PhoneCall, label: "3 leads muito quentes", action: "Ligar agora", tone: "amber" },
  { icon: CircleDollarSign, label: "R$ 12.450 em risco", action: "Ver detalhes", tone: "amber" }
];

const tone = {
  danger: "border-danger/25 bg-danger/10 text-danger",
  amber: "border-amber/25 bg-amber/10 text-amber"
};

function AiCopilotInner() {
  return (
    <aside className="paint-contain relative z-20 hidden h-screen w-[372px] shrink-0 border-l border-white/10 bg-black/35 p-4 backdrop-blur-2xl 2xl:block">
      <section className="relative h-full overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_8%,rgba(168,85,247,.18),transparent_28%),linear-gradient(180deg,rgba(12,18,31,.72),rgba(5,7,13,.86))] p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-purple/25 bg-purple/15 text-purple shadow-[0_0_34px_rgba(168,85,247,.25)]"><Bot size={21} /></div>
            <div><h2 className="text-lg font-black uppercase text-purple">KAU AI</h2><p className="text-xs text-white/48">Copiloto operacional</p></div>
          </div>
          <span className="flex items-center gap-2 text-[10px] font-black uppercase text-money">Online <span className="h-2 w-2 rounded-full bg-money shadow-glowGreen" /></span>
        </div>

        <div className="mt-8 grid place-items-center">
          <div className="gpu-layer relative grid h-[168px] w-[168px] place-items-center rounded-full border border-cyan/20 bg-cyan/10">
            <div className="spin-self absolute inset-[-12px] rounded-full border border-cyan/15 border-t-cyan/70" />
            <div className="ai-core-pulse absolute inset-2 rounded-full bg-cyan/12 blur-xl" />
            <BrainCircuit size={62} className="text-cyan cyan-text" />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan/15 bg-cyan/10 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan"><Sparkles size={13} /> Diagnóstico em tempo real</div>
          <p className="mt-3 text-sm leading-6 text-white/72">Monitorando dinheiro parado, vendedor inativo e follow-up crítico. A janela mais valiosa agora é <span className="font-black text-money">Maria Silva</span>.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-white/42">Impacto estimado</p><p className="mt-1 text-lg font-black text-money">+18%</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-white/42">Risco reduzido</p><p className="mt-1 text-lg font-black text-danger">R$ 4.250</p></div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {alerts.map((alert) => (
            <motion.button key={alert.label} whileHover={{ x: -3 }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${tone[alert.tone as keyof typeof tone]}`}>
              <alert.icon size={18} />
              <span className="min-w-0 flex-1 text-sm font-semibold text-white/75">{alert.label}</span>
              <span className="text-xs font-black">{alert.action}</span>
            </motion.button>
          ))}
        </div>

        <TacticalButton tone="cyan" icon={ArrowRight} className="mt-6 w-full py-4 text-base">Executar recomendação</TacticalButton>
        <p className="mt-4 text-center text-xs text-white/38">KAU AI recalcula prioridade a cada mudança de lead, chamada ou atraso.</p>
      </section>
    </aside>
  );
}

export const AiCopilot = memo(AiCopilotInner);
