import { ProductsScreen } from "@/modules/products/products-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function ProductsPage() {
  return (
    <WorkbenchShell title="Produtos" subtitle="Catálogo e custos">
      <ProductsScreen />
    </WorkbenchShell>
  );
}
