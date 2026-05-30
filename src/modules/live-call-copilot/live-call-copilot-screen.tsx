"use client";

import { BrainCircuit, MessageSquareWarning, Mic2, PhoneCall, Radar, SmilePlus, TimerReset, Volume2 } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, Waveform, ScreenGrid, ReactorRing, LiveChip, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

const transcript = [
  ["Lead", "Eu gostei do AlphaSin, mas estou com receio do prazo de entrega."],
  ["KAU AI", "Objeção detectada: logística. Recomende segurança + confirmação COD."],
  ["Gabriel", "Mariana, eu consigo deixar seu pedido priorizado e confirmado hoje."],
  ["KAU AI", "Momento de fechamento: peça confirmação agora. Temperatura 87%."],
];

export function LiveCallCopilotScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Live negotiation cockpit" title="Live Call Copilot" metric="87% calor" accent="cyan" icon={PhoneCall} description="Escuta operacional em tempo real para cada ligação AlphaSin: transcrição viva, objeções, emoção, silêncio, probabilidade de fechamento e próxima melhor fala sugerida pela IA." />
      <ScreenGrid>
        <div className="col-span-8 space-y-4">
          <TacticalPanel glow="cyan" className="p-5">
            <div className="flex items-center justify-between"><LiveChip>Chamada ativa · Mariana Silva</LiveChip><span className="text-sm font-black text-cyan">02:35</span></div>
            <div className="mt-5 grid grid-cols-[1fr_220px] gap-4">
              <div>
                <Waveform tone="cyan" bars={42} />
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <MetricTile label="Persuasão" value="91" delta="+12 acima da média" tone="money" />
                  <MetricTile label="Silêncio" value="4.2s" delta="normal" tone="cyan" />
                  <MetricTile label="Interrupção" value="8%" delta="baixo risco" tone="money" />
                  <MetricTile label="Fechamento" value="68%" delta="subindo" tone="purple" />
                </div>
              </div>
              <ReactorRing value="8.7" label="lead heat" tone="cyan" />
            </div>
          </TacticalPanel>
          <TacticalPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Transcrição inteligente</p>
            <div className="mt-4 space-y-3">
              {transcript.map(([speaker, text]) => <QueueRow key={text} title={speaker} meta={text} value={speaker === "KAU AI" ? "sinal" : "voz"} tone={speaker === "KAU AI" ? "cyan" : "money"} icon={speaker === "KAU AI" ? BrainCircuit : Mic2} />)}
            </div>
          </TacticalPanel>
        </div>
        <div className="col-span-4 space-y-4">
          <IntelligenceCard title="Diga agora" description="Reforce entrega segura, peça confirmação e use escassez operacional: janela de envio fecha em 23min." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Objeção logística" description="Lead demonstrou medo de prazo. Não fale desconto ainda; fale segurança e confirmação." icon={MessageSquareWarning} tone="amber" />
          <IntelligenceCard title="Emoção positiva" description="Tom de voz está aberto. Lead respondeu rápido após garantia de envio." icon={SmilePlus} tone="money" />
          <TacticalPanel glow="purple" className="p-5">
            <p className="text-xs font-black uppercase tracking-[.18em] text-purple">Radar tático</p>
            <div className="mt-4 space-y-3">
              <QueueRow title="Próxima fala" meta="Peça CPF e confirmação do endereço" value="agora" tone="purple" icon={Radar} />
              <QueueRow title="Alerta de demora" meta="Lead pode esfriar se passar de 4min" value="1m25" tone="amber" icon={TimerReset} />
              <QueueRow title="Tom de voz" meta="Energia do vendedor adequada" value="bom" tone="money" icon={Volume2} />
            </div>
          </TacticalPanel>
        </div>
      </ScreenGrid>
    </div>
  );
}
