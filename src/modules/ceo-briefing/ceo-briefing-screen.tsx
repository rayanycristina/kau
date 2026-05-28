"use client";

import { BarChart3, BrainCircuit, CircleDollarSign, Gauge, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function CeoBriefingScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Executive revenue command" title="CEO Briefing" metric="+18%" accent="money" icon={Gauge} description="Resumo executivo vivo da operação AlphaSin: gargalos, vendedores, dinheiro em risco, previsão de caixa, decisões táticas e próximos movimentos que protegem receita." />
      <ScreenGrid>
        <div className="col-span-8 grid grid-cols-4 gap-4">
          <MetricTile label="Vendas hoje" value="R$ 18.540" delta="37% da meta" tone="money" />
          <MetricTile label="Meta diária" value="R$ 50.000" delta="faltam R$ 31.460" tone="cyan" />
          <MetricTile label="Em risco" value="R$ 94.280" delta="dinheiro esfriando" tone="danger" />
          <MetricTile label="Conversão" value="31%" delta="+6% vs ontem" tone="purple" />
        </div>
        <div className="col-span-4"><ReactorRing value="68%" label="saúde operacional" tone="money" /></div>
        <TacticalPanel glow="cyan" className="col-span-6 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Prioridades executivas</p>
          <div className="mt-4 space-y-3">
            <QueueRow title="Recuperar follow-up crítico" meta="Maria Silva · lead quente · janela fecha em 23min" value="R$ 12.500" tone="danger" icon={ShieldAlert} />
            <QueueRow title="Aumentar confirmação COD" meta="15 pedidos com risco de recusa" value="R$ 18.920" tone="amber" icon={CircleDollarSign} />
            <QueueRow title="Redistribuir leads quentes" meta="vendedor inativo em pico de oportunidade" value="17 leads" tone="cyan" icon={Target} />
          </div>
        </TacticalPanel>
        <div className="col-span-6 grid grid-cols-2 gap-4">
          <IntelligenceCard title="Insight estratégico" description="A operação não precisa de mais leads agora; precisa reduzir latência de follow-up." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Previsão de caixa" description="Com confirmação COD, queda de ganho prevista reduz 11%." icon={TrendingUp} tone="money" />
          <IntelligenceCard title="Gargalo humano" description="Atraso do vendedor está custando mais que falta de demanda." icon={ShieldAlert} tone="danger" />
          <IntelligenceCard title="Relatório vivo" description="Briefing muda conforme ligação, lead e pedido entram na operação." icon={BarChart3} tone="purple" />
        </div>
      </ScreenGrid>
    </div>
  );
}
