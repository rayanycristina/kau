import { ModuleShell } from "@/shell/module-shell";
import { RevenueLeakDetectorScreen } from "@/modules/revenue-leak-detector/revenue-leak-detector-screen";

export default function Page() {
  return (
    <ModuleShell title="Revenue Leak Detector" subtitle="Motor de vazamentos de receita, delay e oportunidades ignoradas">
      <RevenueLeakDetectorScreen />
    </ModuleShell>
  );
}
