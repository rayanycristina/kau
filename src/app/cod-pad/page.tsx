import { ModuleShell } from "@/shell/module-shell";
import { CodPadIntelligenceScreen } from "@/modules/cod-pad-intelligence/cod-pad-intelligence-screen";

export default function Page() {
  return (
    <ModuleShell title="COD/PAD Intelligence" subtitle="Inteligência logística, entrega e confirmação de pagamento AlphaSin">
      <CodPadIntelligenceScreen />
    </ModuleShell>
  );
}
