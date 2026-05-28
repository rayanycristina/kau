"use client";

import { BrainCircuit, MapPin, PackageCheck, ShieldCheck, Truck, WalletCards } from "lucide-react";
import { ModuleHero, MetricTile, IntelligenceCard, ScreenGrid, ReactorRing, QueueRow } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";

const cities = ["Goiânia · alto aceite", "Fortaleza · recusa média", "Salvador · confirmação crítica", "Recife · atraso transportadora"];

export function CodPadIntelligenceScreen() {
  return (
    <div className="space-y-4">
      <ModuleHero eyebrow="Logistics revenue intelligence" title="COD/PAD Intelligence" metric="15 riscos" accent="amber" icon={Truck} description="Camada de inteligência para entrega, pagamento na entrega, confirmação, risco de recusa e previsão de quando a venda AlphaSin realmente vira dinheiro recebido." />
      <ScreenGrid>
        <div className="col-span-3 grid grid-cols-1 gap-4">
          <MetricTile label="COD em risco" value="15" delta="R$ 18.920 monitorados" tone="amber" />
          <MetricTile label="Recusa prevista" value="11%" delta="-3% com confirmação" tone="danger" />
          <MetricTile label="Caixa previsto" value="D+4" delta="média por cidade" tone="money" />
        </div>
        <TacticalPanel glow="cyan" className="col-span-5 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Mapa operacional de entrega</p>
          <div className="mt-5 grid h-[330px] place-items-center rounded-[24px] border border-cyan/15 bg-[radial-gradient(circle_at_50%_50%,rgba(24,215,255,.20),transparent_45%)]">
            <ReactorRing value="74%" label="entrega segura" tone="cyan" />
          </div>
        </TacticalPanel>
        <TacticalPanel className="col-span-4 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber">Cidades e risco</p>
          <div className="mt-4 space-y-3">
            {cities.map((c, i) => <QueueRow key={c} title={c} meta="previsão logística AlphaSin" value={i === 0 ? "bom" : i === 2 ? "crítico" : "médio"} tone={i === 0 ? "money" : i === 2 ? "danger" : "amber"} icon={MapPin} />)}
          </div>
        </TacticalPanel>
        <div className="col-span-12 grid grid-cols-4 gap-4">
          <IntelligenceCard title="Confirmar pagamento" description="IA dispara confirmação personalizada para pedidos com risco acima de 60%." icon={WalletCards} tone="money" />
          <IntelligenceCard title="Prever recusa" description="Combina cidade, atraso, histórico e tempo sem contato." icon={BrainCircuit} tone="cyan" />
          <IntelligenceCard title="Blindar entrega" description="Antes de enviar, vendedor recebe checklist para reduzir devolução." icon={ShieldCheck} tone="purple" />
          <IntelligenceCard title="Status de pacote" description="Operação vê dinheiro em trânsito, não apenas pedido criado." icon={PackageCheck} tone="amber" />
        </div>
      </ScreenGrid>
    </div>
  );
}
