import { WorkingCapitalScreen } from "@/modules/finance/working-capital-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function WorkingCapitalPage() {
  return <WorkbenchShell title="Capital em Giro" subtitle="Quanto dinheiro está fora do caixa e quanto tempo leva para voltar."><WorkingCapitalScreen /></WorkbenchShell>;
}
