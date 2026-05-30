"use client";

import { BrainCircuit, CalendarClock, CheckCircle2, PhoneCall, Send, ShieldAlert, TimerReset } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { followUps } from "@/data/alpha-sin-operation";

export function FollowUpMachineScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Execution pressure system" title="Follow-up Machine" metric="27 ações" accent="purple" icon={TimerReset} description="Fila inteligente que pressiona execução. Leads esfriam visualmente, atrasos escalam e a IA transforma follow-up em missão diária com impacto financeiro claro." />
      <ScreenGrid>
        <div className="col-span-4 grid grid-cols-2 gap-4">
          <MetricTile label="Críticos" value="7" delta="precisam de ação agora" tone="danger" />
          <MetricTile label="Urgentes" value="12" delta="próximos 40min" tone="amber" />
          <MetricTile label="Comissão em jogo" value="R$ 622" delta="5% sobre risco recuperável" tone="money" />
          <MetricTile label="Streak" value="7d" delta="não quebre hoje" tone="purple" />
        </div>
        <TacticalPanel glow="purple" className="col-span-4 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple">Fila de pressão</p>
          <div className="mt-4 space-y-3">
            {followUps.map((f, i) => <QueueRow key={f.id} title={f.title} meta={`${f.context} · ${f.delay}`} value={`R$ ${f.value.toLocaleString("pt-BR")}`} tone={i < 2 ? "danger" : "money"} icon={i < 2 ? ShieldAlert : CheckCircle2} />)}
          </div>
        </TacticalPanel>
        <div className="col-span-4 space-y-4">
          <ReactorRing value="23m" label="até perda provável" tone="danger" />
          <IntelligenceCard title="IA recomenda" description="Ligar Maria Silva agora. Mensagem automática só depois da tentativa de voz." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Ação rápida" description="Executar sequência: ligação, WhatsApp, reagendamento com motivo obrigatório." icon={PhoneCall} tone="money" />
          <IntelligenceCard title="Mensagem pronta" description="Modelo curto de confirmação AlphaSin com urgência sem parecer pressão falsa." icon={Send} tone="purple" />
          <IntelligenceCard title="Reagendar" description="Se ignorar, registrar motivo para evitar buraco invisível de receita." icon={CalendarClock} tone="amber" />
        </div>
      </ScreenGrid>
    </div>
  );
}
