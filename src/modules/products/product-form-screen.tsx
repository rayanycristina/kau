"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Product } from "@/data/product-types";
import { ProductForm, type ProductFormValues } from "@/modules/products/product-form";
import {
  FeedbackBanner,
  localDateKey,
  parseMoney,
  ProductPageHeader,
  productSecondaryButtonClass,
  readJson
} from "@/modules/products/product-ui";

const initialValues: ProductFormValues = {
  name: "",
  sku: "",
  shortDescription: "",
  unitName: "unidade",
  imageUrl: "",
  isActive: true,
  initialUnitCost: "",
  costEffectiveFrom: localDateKey()
};

export function ProductFormScreen() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSetupRequired(false);

    const initialUnitCost = parseMoney(values.initialUnitCost);
    if (!Number.isFinite(initialUnitCost) || initialUnitCost <= 0) {
      setError("Informe um custo unitário inicial maior que zero.");
      return;
    }
    if (!values.name.trim() || !values.unitName.trim() || !values.costEffectiveFrom) {
      setError("Preencha o nome, a unidade de medida e a vigência do custo.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name.trim(),
          sku: values.sku.trim() || undefined,
          shortDescription: values.shortDescription.trim() || undefined,
          unitName: values.unitName.trim(),
          imageUrl: values.imageUrl.trim() || undefined,
          isActive: values.isActive,
          initialUnitCost,
          costEffectiveFrom: values.costEffectiveFrom
        })
      });
      const payload = (await readJson(response)) as { product?: Product; error?: string; setupRequired?: boolean };
      if (!response.ok || !payload.product?.id) {
        setSetupRequired(Boolean(payload.setupRequired));
        setError(String(payload.error || "Não foi possível cadastrar o produto."));
        return;
      }
      router.push(`/products/${payload.product.id}`);
      router.refresh();
    } catch {
      setError("Falha de conexão ao cadastrar o produto. Nenhum dado foi confirmado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 py-5">
      <ProductPageHeader
        eyebrow="Produtos · Cadastro"
        title="Cadastrar produto"
        description="Crie um item de catálogo com custo inicial auditável e pronto para receber kits."
        backHref="/products"
        action={
          <Link href="/products" className={productSecondaryButtonClass}>
            <ArrowLeft size={15} aria-hidden /> Cancelar
          </Link>
        }
      />

      {error ? <FeedbackBanner tone={setupRequired ? "setup" : "error"}>{error}</FeedbackBanner> : null}

      <ProductForm
        values={values}
        onChange={setValues}
        onSubmit={submit}
        saving={saving}
        includeInitialCost
        submitLabel="Cadastrar produto"
      />
    </div>
  );
}
