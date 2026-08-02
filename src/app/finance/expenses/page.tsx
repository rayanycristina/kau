import { ExpensesScreen } from "@/modules/finance/expenses-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function ExpensesPage() {
  return (
    <WorkbenchShell title="Financeiro" subtitle="Despesas operacionais">
      <ExpensesScreen />
    </WorkbenchShell>
  );
}
