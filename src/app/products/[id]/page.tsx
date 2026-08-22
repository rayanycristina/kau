import { ProductDetailsScreen } from "@/modules/products/product-details-screen";
import { WorkbenchShell } from "@/shell/workbench-shell";

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WorkbenchShell title="Produtos" subtitle="Detalhe do produto">
      <ProductDetailsScreen productId={id} />
    </WorkbenchShell>
  );
}
