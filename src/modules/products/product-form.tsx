"use client";

import type { FormEvent } from "react";
import { CircleCheck, CircleOff, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Field,
  ImageUrlPreview,
  productInputClass,
  productPrimaryButtonClass
} from "@/modules/products/product-ui";

export type ProductFormValues = {
  name: string;
  sku: string;
  shortDescription: string;
  unitName: string;
  imageUrl: string;
  isActive: boolean;
  initialUnitCost: string;
  costEffectiveFrom: string;
};

export function ProductForm({
  values,
  onChange,
  onSubmit,
  saving,
  includeInitialCost,
  submitLabel
}: {
  values: ProductFormValues;
  onChange: (values: ProductFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  includeInitialCost: boolean;
  submitLabel: string;
}) {
  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="luxury-surface kau-surgical-surface rounded-[28px] p-5 md:p-6">
        <div className="border-b border-white/[.07] pb-4">
          <h2 className="text-xl font-semibold tracking-[-.035em] text-white">Informações do produto</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">Cadastre somente o necessário para identificar e usar o produto na operação.</p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Nome do produto" className="md:col-span-2">
            <input
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              className={productInputClass}
              maxLength={120}
              autoComplete="off"
              required
            />
          </Field>

          <Field label="SKU / código interno" hint="Opcional e único dentro do catálogo.">
            <input
              value={values.sku}
              onChange={(event) => set("sku", event.target.value)}
              className={productInputClass}
              maxLength={80}
              autoComplete="off"
            />
          </Field>

          <Field label="Unidade de medida" hint="Ex.: unidade, frasco, caixa ou peça.">
            <input
              list="product-unit-suggestions"
              value={values.unitName}
              onChange={(event) => set("unitName", event.target.value)}
              className={productInputClass}
              maxLength={40}
              autoComplete="off"
              required
            />
            <datalist id="product-unit-suggestions">
              <option value="unidade" />
              <option value="frasco" />
              <option value="caixa" />
              <option value="peça" />
            </datalist>
          </Field>

          <Field label="Descrição curta" className="md:col-span-2" hint="Opcional. Use uma descrição objetiva para diferenciar produtos semelhantes.">
            <textarea
              value={values.shortDescription}
              onChange={(event) => set("shortDescription", event.target.value)}
              className={cn(productInputClass, "min-h-28 resize-y leading-6")}
              maxLength={500}
            />
          </Field>

          <Field label="URL externa da imagem (avançado)" className="md:col-span-2" hint="Opcional. Após criar o produto, clique na imagem do detalhe para fazer upload pelo KAU.">
            <input
              type="url"
              value={values.imageUrl}
              onChange={(event) => set("imageUrl", event.target.value)}
              className={productInputClass}
              placeholder="https://"
              autoComplete="off"
            />
          </Field>
        </div>

        {includeInitialCost ? (
          <div className="mt-6 rounded-[24px] border border-money/14 bg-money/[.035] p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-money/20 bg-money/[.08] text-money">
                <CircleCheck size={17} aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Custo unitário inicial</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">Este valor inicia o histórico de custo. Alterações futuras criarão novas vigências sem modificar vendas antigas.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Custo por unidade">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-3.5 text-sm font-semibold text-slate-500">R$</span>
                  <input
                    value={values.initialUnitCost}
                    onChange={(event) => set("initialUnitCost", event.target.value)}
                    className={cn(productInputClass, "pl-10 tabular-nums")}
                    inputMode="decimal"
                    autoComplete="off"
                    required
                  />
                </div>
              </Field>
              <Field label="Vigência a partir de">
                <input
                  type="date"
                  value={values.costEffectiveFrom}
                  onChange={(event) => set("costEffectiveFrom", event.target.value)}
                  className={productInputClass}
                  required
                />
              </Field>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
        <ImageUrlPreview name={values.name} imageUrl={values.imageUrl} />

        <section className="rounded-[24px] border border-white/[.075] bg-[#07111b]/74 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-400">Status do catálogo</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set("isActive", true)}
              aria-pressed={values.isActive}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-semibold transition",
                values.isActive ? "border-money/25 bg-money/10 text-money" : "border-white/[.07] bg-white/[.025] text-slate-500 hover:text-slate-200"
              )}
            >
              <CircleCheck size={15} aria-hidden /> Ativo
            </button>
            <button
              type="button"
              onClick={() => set("isActive", false)}
              aria-pressed={!values.isActive}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-semibold transition",
                !values.isActive ? "border-slate-300/15 bg-white/[.07] text-white" : "border-white/[.07] bg-white/[.025] text-slate-500 hover:text-slate-200"
              )}
            >
              <CircleOff size={15} aria-hidden /> Inativo
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Produtos inativos permanecem no histórico, mas não ficam disponíveis para novas vendas.</p>
        </section>

        <button type="submit" disabled={saving} className={cn(productPrimaryButtonClass, "w-full")}>
          <Save size={16} aria-hidden /> {saving ? "Salvando…" : submitLabel}
        </button>
      </aside>
    </form>
  );
}
