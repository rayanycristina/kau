import { ModuleShell } from "@/shell/module-shell";
import { CoachAiScreen } from "@/modules/coach-ai/coach-ai-screen";

export default function Page() {
  return (
    <ModuleShell title="Coach AI" subtitle="Sistema de evolução comercial e treino de vendedores">
      <CoachAiScreen />
    </ModuleShell>
  );
}
