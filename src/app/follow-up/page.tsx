import { ModuleShell } from "@/shell/module-shell";
import { FollowUpMachineScreen } from "@/modules/follow-up-machine/follow-up-machine-screen";

export default function Page() {
  return (
    <ModuleShell title="Follow-up Machine" subtitle="Fila inteligente de execução e pressão operacional">
      <FollowUpMachineScreen />
    </ModuleShell>
  );
}
