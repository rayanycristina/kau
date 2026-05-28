import { ModuleShell } from "@/shell/module-shell";
import { LiveCallCopilotScreen } from "@/modules/live-call-copilot/live-call-copilot-screen";

export default function Page() {
  return (
    <ModuleShell title="Live Calls" subtitle="Cockpit de chamadas AlphaSin em tempo real">
      <LiveCallCopilotScreen />
    </ModuleShell>
  );
}
