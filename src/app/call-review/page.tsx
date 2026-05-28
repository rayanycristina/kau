import { ModuleShell } from "@/shell/module-shell";
import { CallReviewScreen } from "@/modules/call-review/call-review-screen";

export default function Page() {
  return (
    <ModuleShell title="Call Review" subtitle="Análise pós-ligação, objeções e evolução do vendedor">
      <CallReviewScreen />
    </ModuleShell>
  );
}
