"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CircleCheck, CircleOff, Clock3, Coins, ImagePlus, Layers3, PackageCheck, Plus, Save, Shapes, Trash2, UsersRound } from "lucide-react";
import type { Product, ProductKit } from "@/data/product-types";
import { cn } from "@/lib/utils";
import { ProductForm, type ProductFormValues } from "@/modules/products/product-form";
import { ProductCoproducers } from "@/modules/products/product-coproducers";
import {
  brl,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  Field,
  formatDate,
  localDateKey,
  parseMoney,
  ProductPageHeader,
  productInputClass,
  productPrimaryButtonClass,
  productSecondaryButtonClass,
  readJson,
  StatusBadge
} from "@/modules/products/product-ui";

type ProductTab = "overview" | "costs" | "kits" | "coproducers";
type Feedback = { tone: "success" | "error" | "setup"; text: string } | null;

const tabs: Array<{ value: ProductTab; label: string; icon: typeof PackageCheck }> = [
  { value: "overview", label: "Visão geral", icon: PackageCheck },
  { value: "costs", label: "Custos", icon: Coins },
  { value: "kits", label: "Kits", icon: Shapes }
  ,{ value: "coproducers", label: "Coprodutores", icon: UsersRound }
];

function valuesFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku || "",
    shortDescription: product.shortDescription || "",
    unitName: product.unitName,
    imageUrl: product.imageUrl || "",
    isActive: product.isActive,
    initialUnitCost: "",
    costEffectiveFrom: localDateKey()
  };
}

export function ProductDetailsScreen({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [values, setValues] = useState<ProductFormValues | null>(null);
  const [tab, setTab] = useState<ProductTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [savingOverview, setSavingOverview] = useState(false);
  const [activeRuleCount, setActiveRuleCount] = useState(0);
  const [imageBusy, setImageBusy] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: "no-store", credentials: "include" });
      const payload = (await readJson(response)) as { product?: Product; error?: string; setupRequired?: boolean };
      setSetupRequired(Boolean(payload.setupRequired));
      if (!response.ok || !payload.product) {
        setError(String(payload.error || "Produto não encontrado."));
        return;
      }
      setProduct(payload.product);
      setValues(valuesFromProduct(payload.product));
    } catch {
      setError("Falha de conexão ao carregar este produto.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch(`/api/products/${encodeURIComponent(productId)}/coproducers`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setActiveRuleCount(Array.isArray(payload.rules) ? payload.rules.filter((rule: { status?: string }) => rule.status === "active").length : 0))
      .catch(() => setActiveRuleCount(0));
  }, [productId]);

  async function saveOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values || !product) return;
    setFeedback(null);
    if (!values.name.trim() || !values.unitName.trim()) {
      setFeedback({ tone: "error", text: "Preencha o nome e a unidade de medida." });
      return;
    }
    setSavingOverview(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name.trim(),
          sku: values.sku.trim() || null,
          shortDescription: values.shortDescription.trim() || null,
          unitName: values.unitName.trim(),
          imageUrl: values.imageUrl.trim() || null,
          isActive: values.isActive
        })
      });
      const payload = (await readJson(response)) as { product?: Product; error?: string; setupRequired?: boolean };
      if (!response.ok || !payload.product) {
        setFeedback({ tone: payload.setupRequired ? "setup" : "error", text: String(payload.error || "Não foi possível atualizar o produto.") });
        return;
      }
      setProduct(payload.product);
      setValues(valuesFromProduct(payload.product));
      setFeedback({ tone: "success", text: "Produto atualizado. Custos históricos e vendas existentes permaneceram intactos." });
    } catch {
      setFeedback({ tone: "error", text: "Falha de conexão ao atualizar o produto." });
    } finally {
      setSavingOverview(false);
    }
  }

  async function uploadImage(file: File) {
    if (!product) return; setImageBusy(true); setFeedback(null);
    try { const form = new FormData(); form.set("file", file); const response = await fetch(`/api/products/${product.id}/image`, { method: "POST", body: form }); const payload = await readJson(response) as { imageUrl?: string; error?: string }; if (!response.ok) { setFeedback({ tone:"error", text:String(payload.error||"Não foi possível enviar a imagem.") }); return; } await load(false); setFeedback({tone:"success",text:"Imagem do produto atualizada."}); } finally { setImageBusy(false); }
  }
  async function removeImage() { if (!product) return; setImageBusy(true); const response = await fetch(`/api/products/${product.id}/image`,{method:"DELETE"}); const payload=await readJson(response) as {error?:string}; if(!response.ok)setFeedback({tone:"error",text:String(payload.error||"Não foi possível remover a imagem.")}); else {await load(false);setFeedback({tone:"success",text:"Imagem removida."});} setImageBusy(false); }

  if (loading) return <ProductDetailsSkeleton />;

  if (!product || !values) {
    return (
      <div className="space-y-5 py-5">
        <ProductPageHeader title="Produto" description="Consulte e mantenha o catálogo operacional." backHref="/products" />
        {setupRequired ? <FeedbackBanner tone="setup">A migration de Produtos ainda não foi aplicada.</FeedbackBanner> : null}
        <ErrorState message={error || "Produto não encontrado."} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-5">
      <ProductPageHeader
        eyebrow="Produtos · Detalhe"
        title={product.name}
        description="Informações do catálogo, custo vigente auditável e configurações de kits."
        backHref="/products"
        action={<StatusBadge active={product.isActive} />}
      />

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.text}</FeedbackBanner> : null}

      <section className="luxury-surface kau-surgical-surface overflow-hidden rounded-[30px] p-5 md:p-6"><div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center"><div className="group relative overflow-hidden rounded-[24px] border border-white/[.09] bg-[#07121b] aspect-square"><label className="absolute inset-0 cursor-pointer"><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={imageBusy} onChange={(event)=>{const file=event.target.files?.[0];if(file)void uploadImage(file);event.currentTarget.value="";}}/>{product.imageUrl?<img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover"/>:<span className="grid h-full place-items-center text-slate-600"><ImagePlus size={34}/></span>}<span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur">{imageBusy?"Enviando…":"Clique para trocar a imagem"}</span></label>{product.imageUrl?<button type="button" onClick={()=>void removeImage()} disabled={imageBusy} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl bg-black/70 text-rose-300" aria-label="Remover imagem"><Trash2 size={15}/></button>:null}</div><div><div className="flex flex-wrap items-center gap-2"><StatusBadge active={product.isActive}/>{product.sku?<span className="rounded-lg border border-white/[.08] px-2 py-1 font-mono text-[10px] text-slate-500">{product.sku}</span>:null}</div><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-white">{product.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{product.shortDescription||"Produto operacional do catálogo KAU."}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><IdentityMetric label="Custo vigente" value={product.currentCost==null?"Não informado":brl(product.currentCost)}/><IdentityMetric label="Kits ativos" value={String(product.kits.filter(item=>item.isActive).length)}/><IdentityMetric label="Coprodutores ativos" value={String(activeRuleCount)}/></div></div></div></section>

      <section className="luxury-surface kau-surgical-surface overflow-hidden rounded-[28px]">
        <div className="premium-scrollbar overflow-x-auto border-b border-white/[.07] px-3 md:px-5">
          <div className="flex min-w-max gap-1 py-3" role="tablist" aria-label="Áreas do produto">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.value}
                  onClick={() => { setTab(item.value); setFeedback(null); }}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-money/25",
                    tab === item.value ? "bg-money/[.09] text-money shadow-[inset_0_0_0_1px_rgba(16,185,129,.18)]" : "text-slate-500 hover:bg-white/[.035] hover:text-slate-200"
                  )}
                >
                  <Icon size={15} aria-hidden /> {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {tab === "overview" ? (
        <ProductForm values={values} onChange={setValues} onSubmit={saveOverview} saving={savingOverview} includeInitialCost={false} submitLabel="Salvar alterações" />
      ) : null}
      {tab === "costs" ? <ProductCosts product={product} onReload={load} onFeedback={setFeedback} /> : null}
      {tab === "kits" ? <ProductKits product={product} onReload={load} onFeedback={setFeedback} /> : null}
      {tab === "coproducers" ? <ProductCoproducers productId={product.id} onCount={setActiveRuleCount} /> : null}
    </div>
  );
}

function IdentityMetric({label,value}:{label:string;value:string}) { return <div className="rounded-2xl bg-white/[.025] px-4 py-3 ring-1 ring-inset ring-white/[.06]"><p className="text-[10px] uppercase tracking-[.11em] text-slate-600">{label}</p><p className="mt-1.5 text-lg font-semibold text-white">{value}</p></div>; }

function ProductCosts({ product, onReload, onFeedback }: { product: Product; onReload: (showLoading?: boolean) => Promise<void>; onFeedback: (value: Feedback) => void }) {
  const [unitCost, setUnitCost] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(localDateKey());
  const [saving, setSaving] = useState(false);
  const costs = useMemo(() => [...(product.costs || [])].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)), [product.costs]);
  const today = localDateKey();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onFeedback(null);
    const parsedCost = parseMoney(unitCost);
    if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
      onFeedback({ tone: "error", text: "Informe um custo unitário maior que zero." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ unitCost: parsedCost, effectiveFrom })
      });
      const payload = (await readJson(response)) as { error?: string; setupRequired?: boolean };
      if (!response.ok) {
        onFeedback({ tone: payload.setupRequired ? "setup" : "error", text: String(payload.error || "Não foi possível cadastrar a nova vigência.") });
        return;
      }
      setUnitCost("");
      await onReload(false);
      onFeedback({ tone: "success", text: "Nova vigência cadastrada. O histórico anterior permanece imutável." });
    } catch {
      onFeedback({ tone: "error", text: "Falha de conexão ao cadastrar o custo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="luxury-surface kau-surgical-surface rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b border-white/[.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-cyan"><Clock3 size={14} aria-hidden /> Histórico auditável</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-white">Custos do produto</h2>
            <p className="mt-1 text-sm text-slate-400">Cada alteração cria uma vigência. Registros anteriores nunca são sobrescritos.</p>
          </div>
          <div className="rounded-2xl border border-money/18 bg-money/[.055] px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-money/65">Custo atual</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-money">{product.currentCost != null ? brl(product.currentCost) : "Não configurado"}</p>
            <p className="mt-1 text-[10px] text-slate-500">por {product.unitName}{product.currentCostEffectiveFrom ? ` · desde ${formatDate(product.currentCostEffectiveFrom)}` : ""}</p>
          </div>
        </div>

        <div className="mt-5">
          {costs.length === 0 ? (
            <EmptyState title="Sem histórico de custo" description="Cadastre a primeira vigência para habilitar o custo do produto nas vendas manuais." />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/[.075] bg-[#07111b]/70">
              {costs.map((cost, index) => {
                const isCurrent = cost.effectiveFrom === product.currentCostEffectiveFrom;
                const isFuture = cost.effectiveFrom > today;
                return (
                  <div key={cost.id} className={cn("flex items-center justify-between gap-4 px-4 py-4", index > 0 && "border-t border-white/[.06]")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", isCurrent ? "border-money/20 bg-money/[.08] text-money" : isFuture ? "border-cyan/18 bg-cyan/[.06] text-cyan" : "border-white/[.07] bg-white/[.03] text-slate-500")}>
                        <CalendarDays size={16} aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Vigência em {formatDate(cost.effectiveFrom)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{isCurrent ? "Custo vigente" : isFuture ? "Vigência futura programada" : "Registro histórico preservado"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-base font-semibold tabular-nums", isCurrent ? "text-money" : isFuture ? "text-cyan" : "text-slate-300")}>{brl(cost.unitCost)}</p>
                      <p className="mt-1 text-[10px] text-slate-500">por {product.unitName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <form onSubmit={submit} className="luxury-surface kau-surgical-surface h-fit rounded-[28px] p-5 xl:sticky xl:top-5">
        <div className="flex items-center gap-3 border-b border-white/[.07] pb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-money/20 bg-money/[.07] text-money"><Plus size={17} aria-hidden /></span>
          <div><h2 className="text-base font-semibold text-white">Nova vigência</h2><p className="mt-1 text-xs text-slate-500">O valor anterior será preservado.</p></div>
        </div>
        <div className="mt-5 space-y-4">
          <Field label="Novo custo unitário">
            <div className="relative"><span className="pointer-events-none absolute left-3.5 top-3.5 text-sm font-semibold text-slate-500">R$</span><input value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className={cn(productInputClass, "pl-10 tabular-nums")} inputMode="decimal" required /></div>
          </Field>
          <Field label="Vigência a partir de">
            <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className={productInputClass} required />
          </Field>
          <button type="submit" disabled={saving} className={cn(productPrimaryButtonClass, "w-full")}><Save size={15} aria-hidden />{saving ? "Salvando…" : "Adicionar vigência"}</button>
        </div>
      </form>
    </div>
  );
}

function ProductKits({ product, onReload, onFeedback }: { product: Product; onReload: (showLoading?: boolean) => Promise<void>; onFeedback: (value: Feedback) => void }) {
  const [editing, setEditing] = useState<ProductKit | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function reset() {
    setEditing(null);
    setName("");
    setQuantity("");
    setActive(true);
  }

  function edit(kit: ProductKit) {
    setEditing(kit);
    setName(kit.name);
    setQuantity(String(kit.quantity));
    setActive(kit.isActive);
    onFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onFeedback(null);
    const parsedQuantity = Number(quantity);
    if (!name.trim() || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      onFeedback({ tone: "error", text: "Informe o nome e uma quantidade inteira maior que zero." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}/kits`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...(editing ? { id: editing.id } : {}), name: name.trim(), quantity: parsedQuantity, isActive: active })
      });
      const payload = (await readJson(response)) as { error?: string; setupRequired?: boolean };
      if (!response.ok) {
        onFeedback({ tone: payload.setupRequired ? "setup" : "error", text: String(payload.error || "Não foi possível salvar o kit.") });
        return;
      }
      const message = editing ? "Kit atualizado sem alterar vendas históricas." : "Kit criado e disponível para novas vendas.";
      reset();
      await onReload(false);
      onFeedback({ tone: "success", text: message });
    } catch {
      onFeedback({ tone: "error", text: "Falha de conexão ao salvar o kit." });
    } finally {
      setSaving(false);
    }
  }

  const kits = product.kits || [];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="luxury-surface kau-surgical-surface rounded-[28px] p-5 md:p-6">
        <div className="border-b border-white/[.07] pb-5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-cyan"><Layers3 size={14} aria-hidden /> Configuração recorrente</div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-white">Kits do produto</h2>
          <p className="mt-1 text-sm text-slate-400">Configure nomes e quantidades usados com frequência. Nenhuma quantidade é presumida pelo KAU.</p>
        </div>
        <div className="mt-5">
          {kits.length === 0 ? (
            <EmptyState title="Nenhum kit configurado" description="Crie kits para agilizar a seleção de quantidades nas vendas manuais." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {kits.map((kit) => (
                <article key={kit.id} className={cn("rounded-[22px] border bg-[#07111b]/72 p-4 transition", editing?.id === kit.id ? "border-money/25 shadow-[0_0_0_3px_rgba(16,185,129,.04)]" : "border-white/[.075] hover:border-white/[.13]")}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-semibold text-white">{kit.name}</h3><p className="mt-1 text-xs text-slate-500">{kit.quantity} {kit.quantity === 1 ? product.unitName : pluralUnit(product.unitName)}</p></div><StatusBadge active={kit.isActive} /></div>
                  <div className="mt-5 flex items-end justify-between border-t border-white/[.06] pt-4"><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">Quantidade</p><p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-.04em] text-slate-100">{kit.quantity}</p></div><button type="button" onClick={() => edit(kit)} className="min-h-9 rounded-xl border border-white/[.08] bg-white/[.035] px-3 text-xs font-semibold text-slate-300 transition hover:border-money/20 hover:text-money">Editar</button></div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <form onSubmit={submit} className="luxury-surface kau-surgical-surface h-fit rounded-[28px] p-5 xl:sticky xl:top-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/[.07] pb-4">
          <div><h2 className="text-base font-semibold text-white">{editing ? "Editar kit" : "Novo kit"}</h2><p className="mt-1 text-xs text-slate-500">Um produto principal com quantidade definida.</p></div>
          {editing ? <button type="button" onClick={reset} className="text-xs font-semibold text-slate-500 transition hover:text-white">Cancelar</button> : null}
        </div>
        <div className="mt-5 space-y-4">
          <Field label="Nome do kit"><input value={name} onChange={(event) => setName(event.target.value)} className={productInputClass} maxLength={100} required /></Field>
          <Field label={`Quantidade em ${product.unitName}`}><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={productInputClass} inputMode="numeric" required /></Field>
          <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400/70">Status</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setActive(true)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition", active ? "border-money/25 bg-money/10 text-money" : "border-white/[.07] bg-white/[.025] text-slate-500")}><CircleCheck size={14} aria-hidden />Ativo</button><button type="button" onClick={() => setActive(false)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition", !active ? "border-white/[.14] bg-white/[.07] text-white" : "border-white/[.07] bg-white/[.025] text-slate-500")}><CircleOff size={14} aria-hidden />Inativo</button></div></div>
          <button type="submit" disabled={saving} className={cn(productPrimaryButtonClass, "w-full")}><Save size={15} aria-hidden />{saving ? "Salvando…" : editing ? "Salvar kit" : "Criar kit"}</button>
          {editing ? <button type="button" onClick={reset} className={cn(productSecondaryButtonClass, "w-full")}>Cancelar edição</button> : null}
        </div>
      </form>
    </div>
  );
}

function pluralUnit(unit: string) {
  if (/s$/i.test(unit)) return unit;
  return `${unit}s`;
}

function ProductDetailsSkeleton() {
  return <div className="space-y-5 py-5"><div className="h-[162px] animate-pulse rounded-[30px] border border-white/[.07] bg-white/[.025]" /><div className="h-16 animate-pulse rounded-[28px] border border-white/[.07] bg-white/[.025]" /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="h-[540px] animate-pulse rounded-[28px] border border-white/[.07] bg-white/[.025]" /><div className="h-[360px] animate-pulse rounded-[28px] border border-white/[.07] bg-white/[.025]" /></div></div>;
}
