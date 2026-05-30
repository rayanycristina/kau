"use client";

import { BrainCircuit, Clock3, MessageSquareWarning, Play, ScanText, Star, TrendingDown } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, Waveform, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

export function CallReviewScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Post-call intelligence" title="Call Review" metric="Score 8.7" accent="cyan" icon={ScanText} description="Análise pós-ligação com replay emocional, objeções, momentos fortes, momentos fracos, coaching e plano de evolução para a próxima chamada AlphaSin." />
      <ScreenGrid>
        <TacticalPanel glow="cyan" className="col-span-8 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Replay tático</p>
          <div className="mt-4"><Waveform tone="cyan" bars={58} /></div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <MetricTile label="Score" value="8.7" delta="boa condução" tone="money" />
            <MetricTile label="Objeções" value="3" delta="2 resolvidas" tone="amber" />
            <MetricTile label="Silêncio" value="11s" delta="um momento fraco" tone="danger" />
            <MetricTile label="Próximo passo" value="COD" delta="confirmar entrega" tone="cyan" />
          </div>
        </TacticalPanel>
        <div className="col-span-4"><ReactorRing value="68%" label="chance pós-call" tone="money" /></div>
        <TacticalPanel className="col-span-6 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple">Linha do tempo</p>
          <div className="mt-4 space-y-3">
            <QueueRow title="00:31 · Abertura forte" meta="Lead respondeu com interesse" value="bom" tone="money" icon={Star} />
            <QueueRow title="01:18 · Objeção de entrega" meta="Medo do prazo apareceu" value="atenção" tone="amber" icon={MessageSquareWarning} />
            <QueueRow title="02:44 · Pausa longa" meta="Vendedor demorou para fechar" value="11s" tone="danger" icon={Clock3} />
            <QueueRow title="03:09 · Recuperação" meta="Confirmação quase concluída" value="próximo" tone="cyan" icon={Play} />
          </div>
        </TacticalPanel>
        <div className="col-span-6 grid grid-cols-2 gap-4">
          <IntelligenceCard title="Treinar fechamento" description="Vendedor deve pedir confirmação logo após sinal quente, sem abrir novo argumento." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Momento perdido" description="A pausa de 11 segundos reduziu momentum; usar frase de transição." icon={TrendingDown} tone="danger" />
          <IntelligenceCard title="Objeção vencida" description="Resposta sobre entrega funcionou. Salvar como playbook AlphaSin." icon={Star} tone="money" />
          <IntelligenceCard title="Próxima ação" description="Enviar mensagem de confirmação COD nos próximos 5 minutos." icon={MessageSquareWarning} tone="amber" />
        </div>
      </ScreenGrid>
    </div>
  );
}
