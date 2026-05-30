import { WorkbenchShell } from "@/shell/workbench-shell";
import { SalesDashboardScreen } from "@/modules/sales-dashboard/sales-dashboard-screen";

export default function SalesPage() {
  return (
    <WorkbenchShell title="Vendas" subtitle="">
      <SalesDashboardScreen />
    </WorkbenchShell>
  );
}
