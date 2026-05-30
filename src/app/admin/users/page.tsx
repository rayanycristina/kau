import { WorkbenchShell } from "@/shell/workbench-shell";
import { UsersAdminScreen } from "@/modules/admin/users-admin-screen";

export default function AdminUsersPage() {
  return (
    <WorkbenchShell title="Usuários" subtitle="Gestão de acesso, perfis e vendedores">
      <UsersAdminScreen />
    </WorkbenchShell>
  );
}
