"use client";

import { Trophy } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function SalesArenaPanel() {
  return (
    <TacticalPanel glow="purple" className="col-span-4 p-5">
      <div className="flex items-center justify-between"><div><p className="font-black uppercase text-cyan">Sales Arena</p><p className="text-xs text-white/55">A competição que move o time</p></div><button className="rounded-lg border border-cyan/20 bg-cyan/10 px-3 py-2 text-xs font-bold text-cyan">Ver ranking completo</button></div>
      <div className="mt-6 grid grid-cols-3 items-end gap-4 text-center">
        <Podium place="2" name="Elisangela" points="11.230 pts" sales="13 vendas" tone="cyan" height="h-36" />
        <Podium place="1" name="Gabriel" points="12.450 pts" sales="15 vendas" tone="amber" height="h-48" />
        <Podium place="3" name="Amanda" points="9.850 pts" sales="10 vendas" tone="purple" height="h-32" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4"><div className="rounded-xl border border-purple/30 bg-purple/15 p-4"><p className="text-xs font-black uppercase text-purple">Desafio semanal</p><p className="mt-1 text-sm">Fechar 30 vendas esta semana</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-purple" /></div></div><div className="rounded-xl border border-money/30 bg-money/10 p-4"><p className="text-xs font-black uppercase text-money">Streak ativo</p><p className="text-2xl font-black text-money">🔥 7</p><p className="text-xs text-white/55">dias engajados batendo meta</p></div></div>
    </TacticalPanel>
  );
}

function Podium({ place, name, points, sales, tone, height }: { place: string; name: string; points: string; sales: string; tone: "cyan" | "amber" | "purple"; height: string }) {
  const c = { cyan: "border-cyan/35 bg-cyan/10 text-cyan", amber: "border-amber/35 bg-amber/10 text-amber", purple: "border-purple/35 bg-purple/10 text-purple" }[tone];
  return <div className={`rounded-t-3xl border ${c} ${height} flex flex-col items-center justify-end p-4 shadow-panel`}><Trophy /><p className="mt-2 text-5xl font-black">{place}</p><p className="mt-2 font-bold text-white">{name}</p><p className="text-xs font-bold">{points}</p><p className="text-xs text-white/55">{sales}</p></div>;
}
