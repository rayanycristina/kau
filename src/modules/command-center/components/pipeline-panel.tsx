"use client";

import { pipeline } from "@/data/alpha-sin-operation";
import { brl } from "@/lib/utils";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function PipelinePanel() {
  return (
    <TacticalPanel glow="cyan" className="col-span-4 p-5">
      <p className="font-black uppercase text-cyan">Pipeline Inteligente</p>
      <p className="text-xs text-white/55">128 oportunidades em andamento</p>
      <div className="mt-5 grid grid-cols-[1fr_130px] gap-4">
        <div className="space-y-2">
          {pipeline.map((stage, index) => <div key={stage.label} className="grid grid-cols-[1fr_52px_88px] rounded-lg border border-white/10 bg-black/24 px-3 py-3 text-xs" style={{ marginLeft: index * 8 }}><span>{stage.label}</span><b>{stage.count}</b><span>{brl(stage.value)}</span></div>)}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-center"><p className="text-xs text-white/60">Chance de fechamento</p><div className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full border-[8px] border-money/70 bg-money/10"><p className="text-3xl font-black">68%</p></div><p className="mt-4 text-xs text-money font-bold">+8% vs ontem</p></div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs text-white/55">Valor total do pipeline</p><p className="text-2xl font-black">R$ 808.000</p><p className="text-xs font-bold text-money">+12% vs ontem</p></div>
    </TacticalPanel>
  );
}
