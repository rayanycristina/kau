import { ModuleShell } from "@/shell/module-shell";
import { SalesArenaScreen } from "@/modules/sales-arena/sales-arena-screen";

export default function Page() {
  return (
    <ModuleShell title="Sales Arena" subtitle="Metas, desempenho e pressão comercial em tempo real" showAiCopilot={false} showQuickDock={false}>
      <SalesArenaScreen />
    </ModuleShell>
  );
}
