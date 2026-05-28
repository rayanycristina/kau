import { ModuleShell } from "@/shell/module-shell";
import { MoneyAlertCenterScreen } from "@/modules/money-alert-center/money-alert-center-screen";

export default function Page() {
  return (
    <ModuleShell title="Money Alert Center" subtitle="Central de recuperação de dinheiro parado e perda provável">
      <MoneyAlertCenterScreen />
    </ModuleShell>
  );
}
