"use client";

import { BrainCircuit, Dumbbell, GraduationCap, MessageSquareWarning, Radar, Target, Trophy } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

const skills = [
  ["Fechamento direto", "Gabriel hesita antes do pedido", "78%"],
  ["Objeção logística", "Elisangela precisa de script de segurança", "64%"],
  ["Controle de silêncio", "Amanda mantém ritmo ideal", "91%"],
  ["Confirmação COD", "time perde 11% por demora", "72%"],
];

export function CoachAiScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Seller evolution intelligence" title="Coach AI" metric="4 treinos" accent="cyan" icon={GraduationCap} description="Sistema de evolução do vendedor: detecta fraquezas em ligações, cria treinos de objeção, simula roleplays e transforma performance em plano de mastery comercial." />
      <ScreenGrid>
        <TacticalPanel glow="cyan" className="col-span-5 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Skill heatmap</p>
          <div className="mt-4 space-y-3">
            {skills.map(([name, meta, value], i) => <QueueRow key={name} title={name} meta={meta} value={value} tone={i === 1 ? "danger" : i === 2 ? "money" : "cyan"} icon={Target} />)}
          </div>
        </TacticalPanel>
        <div className="col-span-3 grid grid-cols-1 gap-4">
          <MetricTile label="Score médio" value="8.4" delta="+0.6 em 7 dias" tone="money" />
          <MetricTile label="Objeções vencidas" value="42" delta="semana atual" tone="cyan" />
          <MetricTile label="Treinos pendentes" value="4" delta="2 críticos" tone="amber" />
        </div>
        <div className="col-span-4 space-y-4">
          <ReactorRing value="91" label="mastery de Amanda" tone="money" />
          <IntelligenceCard title="Roleplay agora" description="Simular objeção: prazo de entrega + medo de pagamento na entrega." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Plano de evolução" description="Gabriel deve treinar pedido de fechamento em até 30 segundos após sinal quente." icon={Dumbbell} tone="purple" />
        </div>
        <div className="col-span-12 grid grid-cols-4 gap-4">
          <IntelligenceCard title="Objeção detectada" description="Logística é a objeção que mais trava AlphaSin hoje." icon={MessageSquareWarning} tone="amber" />
          <IntelligenceCard title="Radar de fraqueza" description="Vendedor perde ritmo quando lead pede garantia." icon={Radar} tone="danger" />
          <IntelligenceCard title="Evolução visível" description="Mastery sobe após treino concluído e ligação real melhorada." icon={Trophy} tone="money" />
          <IntelligenceCard title="Script dinâmico" description="IA gera fala curta conforme objeção, cidade e temperatura do lead." icon={BrainCircuit} tone="cyan" />
        </div>
      </ScreenGrid>
    </div>
  );
}
