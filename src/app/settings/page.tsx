"use client";

import { ModuleShell } from "@/shell/module-shell";
import { MetricTile, ModuleHero, ScreenGrid, IntelligenceCard } from "@/modules/shared/module-primitives";
import { Settings, Bell, Palette, ShieldCheck, Volume2 } from "lucide-react";

export default function Page() {
  return (
    <ModuleShell title="Configurações" subtitle="Preferências operacionais, alertas, som, identidade e permissões do sistema KAU">
      <div className="space-y-4">
        <ModuleHero eyebrow="System control" title="Configurações KAU" metric="Sistema vivo" accent="cyan" icon={Settings} description="Central para calibrar a pressão operacional: sons, intensidade de alertas, aparência tática, metas AlphaSin, comissão e permissões da operação." />
        <ScreenGrid>
          <div className="col-span-12 grid grid-cols-4 gap-4">
            <MetricTile label="Comissão padrão" value="5%" delta="sobre vendas do vendedor" tone="money" />
            <MetricTile label="Alertas críticos" value="ON" delta="money alert ativo" tone="danger" />
            <MetricTile label="Motion" value="Premium" delta="respiração operacional" tone="purple" />
            <MetricTile label="Realtime" value="Ativo" delta="socket preparado" tone="cyan" />
          </div>
          <div className="col-span-12 grid grid-cols-4 gap-4">
            <IntelligenceCard title="Som tático" description="Ativar feedback premium para venda, risco, missão concluída e ranking." icon={Volume2} tone="cyan" />
            <IntelligenceCard title="Alertas" description="Configurar escalada visual de follow-up e dinheiro parado." icon={Bell} tone="danger" />
            <IntelligenceCard title="Aparência" description="Tokens dark, neon, glass, glow e densidade operacional." icon={Palette} tone="purple" />
            <IntelligenceCard title="Permissões" description="Gestor, vendedor, CEO e modo monitoria." icon={ShieldCheck} tone="money" />
          </div>
        </ScreenGrid>
      </div>
    </ModuleShell>
  );
}
