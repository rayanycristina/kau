"use client";

import { BrainCircuit, Droplets, PhoneMissed, ShieldAlert, TimerReset, TrendingDown } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function RevenueLeakDetectorScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Leak intelligence engine" title="Revenue Leak Detector" metric="R$ 94.280" accent="danger" icon={Droplets} description="Motor que revela dinheiro perdido por demora, objeção mal tratada, lead ignorado, COD recusado, vendedor inativo e oportunidade parada." />
      <ScreenGrid>
        <TacticalPanel glow="red" className="col-span-4 p-6"><ReactorRing value="R$ 94k" label="risco total" tone="danger" /></TacticalPanel>
        <div className="col-span-4 grid grid-cols-2 gap-4">
          <MetricTile label="Delay" value="R$ 22k" delta="follow-up atrasado" tone="danger" />
          <MetricTile label="Objeções" value="R$ 14k" delta="não resolvidas" tone="amber" />
          <MetricTile label="COD" value="R$ 18k" delta="recusa provável" tone="danger" />
          <MetricTile label="Inatividade" value="R$ 9k" delta="vendedor parado" tone="purple" />
        </div>
        <TacticalPanel className="col-span-4 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-danger">Fontes de vazamento</p>
          <div className="mt-4 space-y-3">
            <QueueRow title="Lead quente ignorado" meta="Sem contato após sinal de compra" value="R$ 12.500" tone="danger" icon={PhoneMissed} />
            <QueueRow title="Janela vencida" meta="Tempo médio acima do ideal" value="R$ 4.250" tone="amber" icon={TimerReset} />
            <QueueRow title="Objeção repetida" meta="Logística sem resposta forte" value="R$ 3.980" tone="danger" icon={TrendingDown} />
          </div>
        </TacticalPanel>
        <div className="col-span-12 grid grid-cols-3 gap-4">
          <IntelligenceCard title="Causa raiz" description="O maior vazamento hoje é demora de ação, não falta de oportunidade." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Ação corretiva" description="Fila obrigatória de 7 follow-ups críticos antes de novas prospecções." icon={ShieldAlert} tone="danger" />
          <IntelligenceCard title="Forecast salvo" description="Recuperar top 3 alertas pode proteger R$ 20.730 de receita." icon={TrendingDown} tone="money" />
        </div>
      </ScreenGrid>
    </div>
  );
}
