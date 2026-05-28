import { ModuleShell } from "@/shell/module-shell";
import { CeoBriefingScreen } from "@/modules/ceo-briefing/ceo-briefing-screen";

export default function Page() {
  return (
    <ModuleShell title="CEO Briefing" subtitle="Controle executivo da operação, riscos e forecast">
      <CeoBriefingScreen />
    </ModuleShell>
  );
}
