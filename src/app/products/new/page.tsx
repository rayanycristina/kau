import { ProductFormScreen } from "@/modules/products/product-form-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default function NewProductPage() {
  return (
    <WorkbenchShell title="Produtos" subtitle="Cadastrar produto">
      <ProductFormScreen />
    </WorkbenchShell>
  );
}
