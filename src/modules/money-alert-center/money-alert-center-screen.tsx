"use client";

import { BrainCircuit, Flame, PhoneCall, Send, ShieldAlert, Siren, TimerReset } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { moneyAlerts } from "@/data/alpha-sin-operation";

export function MoneyAlertCenterScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Revenue damage control" title="Money Alert Center" metric="R$ 12.450" accent="danger" icon={Siren} description="Central agressiva de dinheiro parado. Cada atraso vira perda provável, cada lead quente ignorado vira alerta e cada ação exige resolução, ligação ou motivo documentado." />
      <ScreenGrid>
        <TacticalPanel glow="red" className="col-span-5 grid place-items-center p-6">
          <ReactorRing value="R$ 12.450" label="esfriando agora" tone="danger" />
          <p className="mt-6 text-center text-sm leading-6 text-white/62">A operação está vazando dinheiro por follow-up atrasado, COD sem confirmação e proposta parada. KAU AI recomenda recuperar a primeira janela antes de automatizar mensagem.</p>
        </TacticalPanel>
        <div className="col-span-3 grid grid-cols-1 gap-4">
          <MetricTile label="Perda provável" value="23min" delta="janela crítica" tone="danger" />
          <MetricTile label="Valor recuperável" value="R$ 8.230" delta="alta probabilidade" tone="money" />
          <MetricTile label="Alertas ativos" value="9" delta="4 críticos" tone="amber" />
        </div>
        <TacticalPanel className="col-span-4 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-danger">Fila de dano</p>
          <div className="mt-4 space-y-3">
            {moneyAlerts.map((m) => <QueueRow key={m.id} title={m.title} meta={`${m.reason} · ${m.age}`} value={`R$ ${m.amount.toLocaleString("pt-BR")}`} tone={m.severity === "critical" ? "danger" : "amber"} icon={ShieldAlert} />)}
          </div>
        </TacticalPanel>
        <div className="col-span-12 grid grid-cols-3 gap-4">
          <IntelligenceCard title="Ligar agora" description="Prioridade máxima: Mariana Silva, lead quente, R$ 12.500 de impacto possível." icon={PhoneCall} tone="money" />
          <IntelligenceCard title="Enviar confirmação COD" description="Pedido parado há 41min. Mensagem curta reduz risco sem consumir vendedor." icon={Send} tone="amber" />
          <IntelligenceCard title="Escalar para gestor" description="Se passar de 30min, alerta sobe para modo crítico e entra no briefing CEO." icon={BrainCircuit} tone="danger" />
        </div>
      </ScreenGrid>
    </div>
  );
}
