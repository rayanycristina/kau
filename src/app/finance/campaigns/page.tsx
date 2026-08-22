import { CampaignsScreen } from "@/modules/finance/campaigns-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function CampaignsPage() {
  return <WorkbenchShell title="Financeiro" subtitle="Campanhas e performance"><CampaignsScreen /></WorkbenchShell>;
}
