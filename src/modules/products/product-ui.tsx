"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Box, CircleCheck, ImageIcon, PackageOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const productInputClass =
  "w-full rounded-2xl border border-slate-400/[.12] bg-[#060A11]/90 px-3.5 py-3 text-sm font-medium tracking-[-.012em] text-slate-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-200 placeholder:text-slate-600 hover:border-slate-300/[.18] focus:border-money/40 focus:bg-money/[.025] focus:shadow-[0_0_0_3px_rgba(16,185,129,.06)] disabled:cursor-not-allowed disabled:opacity-45 [color-scheme:dark] [&_option]:bg-[#050912] [&_option]:text-slate-100";

export const productLabelClass = "mb-2 block text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400/70";

export const productPrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-money/35 bg-money px-4 text-sm font-bold text-[#03140d] shadow-[0_0_38px_rgba(16,185,129,.17)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#25e69d] focus:outline-none focus:ring-2 focus:ring-money/35 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

export const productSecondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/[.09] bg-white/[.035] px-4 text-sm font-semibold text-slate-200 transition duration-200 hover:border-white/[.16] hover:bg-white/[.065] focus:outline-none focus:ring-2 focus:ring-cyan/25 disabled:cursor-not-allowed disabled:opacity-45";

export const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/R\$/gi, "");
  if (!normalized) return Number.NaN;
  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  return Number(decimal);
}

export async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: "O servidor retornou uma resposta inválida." } as Record<string, unknown>;
  }
}

export function ProductPageHeader({
  eyebrow = "Produtos",
  title,
  description,
  action,
  backHref
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  backHref?: string;
}) {
  return (
    <header className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] px-5 py-5 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,.15),transparent_34%),radial-gradient(circle_at_90%_4%,rgba(24,215,255,.09),transparent_30%),linear-gradient(120deg,rgba(255,255,255,.04),transparent_56%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {backHref ? (
            <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-money">
              <ArrowLeft size={14} aria-hidden /> Voltar para Meus produtos
            </Link>
          ) : null}
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-money">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-white md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-300/70">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className={productLabelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function ProductImage({ name, imageUrl, className }: { name: string; imageUrl?: string; className?: string }) {
  const safeUrl = imageUrl && /^(https?:\/\/|\/)/i.test(imageUrl) ? imageUrl.replace(/["\\]/g, "") : undefined;
  return (
    <div
      role={safeUrl ? "img" : undefined}
      aria-label={safeUrl ? `Imagem de ${name}` : undefined}
      className={cn(
        "relative grid overflow-hidden rounded-2xl border border-white/[.075] bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,.10),transparent_44%),#07101a]",
        safeUrl ? "bg-contain bg-center bg-no-repeat" : "place-items-center",
        className
      )}
      style={safeUrl ? { backgroundImage: `url("${safeUrl}")` } : undefined}
    >
      {!safeUrl ? <PackageOpen className="text-money/55" size={38} strokeWidth={1.35} aria-hidden /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,.035),transparent_40%)]" />
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em]",
        active ? "border-money/25 bg-money/10 text-money" : "border-white/10 bg-white/[.04] text-slate-400"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-money shadow-[0_0_10px_rgba(16,185,129,.8)]" : "bg-slate-500")} />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function FeedbackBanner({ tone, children }: { tone: "success" | "error" | "setup"; children: ReactNode }) {
  const Icon = tone === "success" ? CircleCheck : AlertTriangle;
  return (
    <div
      role={tone === "success" ? "status" : "alert"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-5",
        tone === "success" && "border-money/20 bg-money/[.07] text-money",
        tone === "error" && "border-danger/22 bg-danger/[.07] text-red-200",
        tone === "setup" && "border-amber/25 bg-amber/[.08] text-amber"
      )}
    >
      <Icon className="mt-0.5 shrink-0" size={17} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function LoadingProducts({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Carregando produtos">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[236px] animate-pulse rounded-[26px] border border-white/[.07] bg-white/[.025]" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/[.1] bg-black/10 px-5 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-money/20 bg-money/[.07] text-money">
        <Box size={25} aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-[-.025em] text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[270px] flex-col items-center justify-center rounded-[26px] border border-danger/15 bg-danger/[.025] px-5 text-center">
      <AlertTriangle className="text-danger" size={28} aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-white">Não foi possível carregar Produtos</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={cn(productSecondaryButtonClass, "mt-5")}>
          <RefreshCw size={15} aria-hidden /> Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function ImageUrlPreview({ name, imageUrl }: { name: string; imageUrl: string }) {
  return (
    <div className="rounded-[24px] border border-white/[.075] bg-[#07111b]/74 p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-slate-400">
        <ImageIcon size={14} className="text-cyan" aria-hidden /> Pré-visualização
      </div>
      <ProductImage name={name || "produto"} imageUrl={imageUrl} className="mt-4 aspect-[4/3] w-full" />
      <p className="mt-3 text-[11px] leading-4 text-slate-500">A imagem é opcional. Nenhum upload é realizado pelo KAU nesta versão.</p>
    </div>
  );
}
