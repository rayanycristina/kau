import { WorkbenchShell } from "@/shell/workbench-shell";
import { TeamSellersScreen } from "@/modules/team/team-sellers-screen";

export default function TeamPage() {
  return (
    <WorkbenchShell title="Equipe / Vendedores" subtitle="Comissões, logins e regras comerciais">
      <TeamSellersScreen />
    </WorkbenchShell>
  );
}
