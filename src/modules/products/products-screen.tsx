"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers3, PackagePlus, Search } from "lucide-react";
import type { Product, ProductStatusFilter } from "@/data/product-types";
import { cn } from "@/lib/utils";
import {
  brl,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  LoadingProducts,
  ProductImage,
  ProductPageHeader,
  productInputClass,
  productPrimaryButtonClass,
  readJson,
  StatusBadge
} from "@/modules/products/product-ui";

type ProductsPayload = {
  products?: Product[];
  setupRequired?: boolean;
  canViewCosts?: boolean;
  error?: string;
};

const statusOptions: Array<{ value: ProductStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" }
];

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [canViewCosts, setCanViewCosts] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/products", { cache: "no-store", credentials: "include" });
      const payload = (await readJson(response)) as ProductsPayload;
      setSetupRequired(Boolean(payload.setupRequired));
      if (!response.ok) {
        setProducts([]);
        setError(String(payload.error || "Não foi possível carregar o catálogo."));
        return;
      }
      setProducts(Array.isArray(payload.products) ? payload.products : []);
      setCanViewCosts(Boolean(payload.canViewCosts));
    } catch {
      setProducts([]);
      setError("Falha de conexão ao carregar o catálogo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      if (status === "active" && !product.isActive) return false;
      if (status === "inactive" && product.isActive) return false;
      if (!term) return true;
      return [product.name, product.sku, product.shortDescription, product.unitName]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [products, search, status]);

  const counts = useMemo(
    () => ({ all: products.length, active: products.filter((item) => item.isActive).length, inactive: products.filter((item) => !item.isActive).length }),
    [products]
  );

  return (
    <div className="space-y-5 py-5">
      <ProductPageHeader
        title="Meus produtos"
        description="Catálogo, custos e produtos ativos da operação."
        action={
          <Link href="/products/new" className={productPrimaryButtonClass}>
            <PackagePlus size={17} aria-hidden /> Novo produto
          </Link>
        }
      />

      {setupRequired ? (
        <FeedbackBanner tone="setup">
          A migration de Produtos precisa ser aprovada e aplicada para ativar o catálogo. Nenhum dado foi alterado.
        </FeedbackBanner>
      ) : null}

      <section className="luxury-surface kau-surgical-surface overflow-hidden rounded-[28px]">
        <div className="border-b border-white/[.07] p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-cyan">
                <Layers3 size={14} aria-hidden /> Catálogo operacional
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {loading ? "Carregando produtos…" : `${filteredProducts.length} de ${products.length} ${products.length === 1 ? "produto" : "produtos"}`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(220px,360px)_auto]">
              <label className="relative block">
                <span className="sr-only">Pesquisar produtos</span>
                <Search className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500" size={16} aria-hidden />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={cn(productInputClass, "pl-10")}
                  placeholder="Buscar por produto ou SKU"
                />
              </label>
              <div className="flex rounded-2xl border border-white/[.075] bg-[#060A11]/82 p-1" role="group" aria-label="Filtrar por status">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition",
                      status === option.value ? "bg-white/[.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]" : "text-slate-500 hover:text-slate-200"
                    )}
                  >
                    {option.label}
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] tabular-nums", status === option.value ? "bg-money/10 text-money" : "bg-white/[.035] text-slate-600")}>
                      {counts[option.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          {loading ? <LoadingProducts /> : null}
          {!loading && error && !setupRequired ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && setupRequired ? (
            <EmptyState title="Catálogo aguardando ativação" description="A estrutura está pronta, mas a migration ainda não foi aplicada. O restante do KAU continua disponível." />
          ) : null}
          {!loading && !error && products.length === 0 ? (
            <EmptyState
              title="Seu catálogo começa aqui"
              description="Cadastre o primeiro produto para organizar custos unitários e kits usados nas vendas manuais."
              action={
                <Link href="/products/new" className={productPrimaryButtonClass}>
                  <PackagePlus size={16} aria-hidden /> Cadastrar produto
                </Link>
              }
            />
          ) : null}
          {!loading && !error && products.length > 0 && filteredProducts.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou o filtro de status para visualizar outros itens do catálogo." />
          ) : null}
          {!loading && !error && filteredProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCatalogCard key={product.id} product={product} canViewCosts={canViewCosts} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProductCatalogCard({ product, canViewCosts }: { product: Product; canViewCosts: boolean }) {
  const activeKits = product.kits?.filter((kit) => kit.isActive).length || 0;
  return (
    <article className="executive-card kau-surgical-card group relative flex min-h-[236px] overflow-hidden rounded-[26px] border border-white/[.075] bg-[#07111b]/78 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-money/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,.08),transparent_34%),linear-gradient(130deg,rgba(255,255,255,.035),transparent_48%)]" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-4">
          <ProductImage name={product.name} imageUrl={product.imageUrl} className="h-20 w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-[-.03em] text-white" title={product.name}>{product.name}</h2>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[.09em] text-slate-500">{product.sku || "Sem SKU"}</p>
              </div>
              <StatusBadge active={product.isActive} />
            </div>
            <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-[18px] text-slate-400">{product.shortDescription || "Sem descrição cadastrada."}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[.065] pt-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">Custo atual</p>
            <p className={cn("mt-1.5 text-sm font-semibold tabular-nums", canViewCosts && product.currentCost != null ? "text-money" : "text-slate-400")}>
              {canViewCosts ? (product.currentCost != null ? `${brl(product.currentCost)} / ${product.unitName}` : "Não configurado") : "Restrito"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">Kits ativos</p>
            <p className="mt-1.5 text-sm font-semibold text-slate-200">{activeKits} {activeKits === 1 ? "kit" : "kits"}</p>
          </div>
        </div>

        <Link href={`/products/${product.id}`} className="mt-auto flex min-h-10 items-center justify-between border-t border-white/[.065] pt-4 text-xs font-semibold text-slate-300 transition group-hover:text-money">
          Ver produto <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
