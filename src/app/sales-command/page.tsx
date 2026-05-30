import { ModuleShell } from "@/shell/module-shell";
import { SalesCommandScreen } from "@/modules/sales-command/sales-command-screen";

export default function Page() {
  return (
    <ModuleShell title="Sales Command" subtitle="Sistema operacional de fechamento guiado" showQuickDock={false} showAiCopilot={false}>
      <SalesCommandScreen />
    </ModuleShell>
  );
}
