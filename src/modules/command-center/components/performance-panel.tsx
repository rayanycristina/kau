"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { brl } from "@/lib/utils";
import { useOperationStore } from "@/store/operation-store";

const baseData = [
  { day: "Seg", value: 9000 }, { day: "Ter", value: 18500 }, { day: "Qua", value: 14500 }, { day: "Qui", value: 19000 }, { day: "Sex", value: 11800 }, { day: "Sab", value: 14200 }
];

export function PerformancePanel() {
  const dailyRevenue = useOperationStore((s) => s.dailyRevenue);
  const salesCount = useOperationStore((s) => s.salesCount);
  const totalCommission = useOperationStore((s) => s.totalCommission);
  const gabrielCommission = useOperationStore((s) => s.gabrielCommission);
  const elisangelaCommission = useOperationStore((s) => s.elisangelaCommission);
  const data = [...baseData, { day: "Hoje", value: dailyRevenue }];

  return (
    <TacticalPanel glow="purple" className="col-span-4 p-5">
      <div className="flex items-center justify-between"><div><p className="font-black uppercase text-purple">Performance do Time</p><p className="text-xs text-white/55">Carteira real, minha comissão e subcomissões da equipe</p></div><button className="text-xs font-bold text-purple">Ver relatório</button></div>
      <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
        <Metric label="Vendas hoje" value={brl(dailyRevenue)} delta={salesCount ? `${salesCount} registros` : "aguardando vendas"} />
        <Metric label="Minha comissão" value={brl(totalCommission)} delta="Rayany" />
        <Metric label="Gabriel" value={brl(gabrielCommission)} delta="subcomissão a pagar" />
        <Metric label="Elisangela" value={brl(elisangelaCommission)} delta="subcomissão a pagar" />
      </div>
      <div className="mt-5 h-44">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.55)", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#080B12", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} formatter={(v) => brl(Number(v))} /><Line dataKey="value" stroke="#18FF8B" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
      </div>
    </TacticalPanel>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <div><p className="text-white/45">{label}</p><p className="mt-2 text-lg font-black">{value}</p><p className="text-[10px] font-bold text-money">{delta}</p></div>;
}
