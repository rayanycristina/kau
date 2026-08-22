import { ExpeditionScreen } from "@/modules/finance/expedition-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function ExpeditionPage() {
  return <WorkbenchShell title="Expedição" subtitle="" hideTopbar><ExpeditionScreen /></WorkbenchShell>;
}
