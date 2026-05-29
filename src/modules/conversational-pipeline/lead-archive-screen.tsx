"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { TacticalButton } from "@/components/ui/tactical-button";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { cn } from "@/lib/utils";
import type { LeadContactStatus, LeadInput, LeadPriority, LeadRecord, LeadTemperature } from "@/data/leads-types";
import { useAuth } from "@/contexts/auth-context";
import { defaultLeadSeller, leadSellerOptions, normalizeLeadSeller } from "@/data/lead-sellers";

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan/40 focus:bg-cyan/[.045] focus:shadow-[0_0_0_3px_rgba(34,211,238,.08)]";
const labelClass = "mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/38";
const sectionClass = "rounded-[1.5rem] border border-white/10 bg-white/[.02] p-4";

const statusLabel: Record<LeadContactStatus, string> = {
  new: "Novo lead",
  answered: "Atendeu",
  not_answered: "Não atendeu",
  called_no_answer: "Liguei sem resposta",
  scheduled: "Pré-agendou",
  call_soon: "Ligar daqui pouco",
  return_tomorrow: "Retornar amanhã",
  proposal_sent: "Proposta enviada",
  sold: "Comprou",
  lost: "Perdido"
};

const tempLabel: Record<LeadTemperature, string> = {
  hot: "Quente",
  warm: "Morno",
  cold: "Frio"
};

const priorityLabel: Record<LeadPriority, string> = {
  critical: "Crítica",
  high: "Alta",
  normal: "Normal",
  low: "Baixa"
};

function tempClass(temp: LeadTemperature) {
  if (temp === "hot") return "border-danger/25 bg-danger/10 text-danger";
  if (temp === "warm") return "border-amber/25 bg-amber/10 text-amber";
  return "border-cyan/25 bg-cyan/10 text-cyan";
}

function statusClass(status: LeadContactStatus) {
  if (status === "sold") return "border-money/25 bg-money/10 text-money";
  if (status === "lost") return "border-white/15 bg-white/10 text-white/55";
  if (["return_tomorrow", "call_soon", "scheduled"].includes(status)) return "border-purple/25 bg-purple/10 text-purple";
  if (["answered", "proposal_sent"].includes(status)) return "border-cyan/25 bg-cyan/10 text-cyan";
  return "border-white/10 bg-white/[.05] text-white/70";
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
}

function normalizeDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeDateLabel(value?: string) {
  if (!value) return "Sem retorno";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Retorno definido";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function plusHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return normalizeDateTime(date.toISOString());
}

function tomorrowAt(hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return normalizeDateTime(date.toISOString());
}

function toEditable(lead: LeadRecord): LeadInput {
  return {
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    city: lead.city || "",
    address: lead.address || "",
    neighborhood: lead.neighborhood || "",
    productName: lead.productName || "AlphaSin",
    temperature: lead.temperature,
    contactStatus: lead.contactStatus,
    priority: lead.priority,
    sellerName: normalizeLeadSeller(lead.sellerName),
    nextAction: lead.nextAction || "",
    nextActionAt: normalizeDateTime(lead.nextActionAt),
    lastContactAt: normalizeDateTime(lead.lastContactAt),
    estimatedValue: lead.estimatedValue || 197,
    source: lead.source || "",
    notes: lead.notes || "",
    objections: lead.objections || "",
    followUpHistory: lead.followUpHistory || ""
  };
}

export function LeadArchiveScreen({ leadId }: { leadId: string }) {
  const { profile, isAdmin } = useAuth();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [draft, setDraft] = useState<LeadInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/leads/${leadId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((payload) => {
        if (!alive) return;
        const record = payload.lead as LeadRecord;
        setLead(record);
        setDraft(toEditable(record));
      })
      .catch(() => setMessage("Não consegui carregar o arquivo do lead."))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, [leadId]);

  const summary = useMemo(() => {
    if (!draft) return null;
    return {
      temperature: draft.temperature || "hot",
      status: draft.contactStatus || "new",
      priority: draft.priority || "high",
      value: draft.estimatedValue || 0
    };
  }, [draft]);

  function updateDraft<K extends keyof LeadInput>(field: K, value: LeadInput[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function onMoney(event: ChangeEvent<HTMLInputElement>) {
    updateDraft("estimatedValue", Number(event.target.value || 0));
  }

  function applyQuickPreset(type: "answered" | "no_answer" | "tomorrow" | "soon" | "sold") {
    if (!draft) return;
    const now = normalizeDateTime(new Date().toISOString());
    if (type === "answered") setDraft({ ...draft, contactStatus: "answered", lastContactAt: now });
    if (type === "no_answer") setDraft({ ...draft, contactStatus: "called_no_answer", lastContactAt: now, nextAction: "Tentar nova ligação" });
    if (type === "tomorrow") setDraft({ ...draft, contactStatus: "return_tomorrow", nextAction: "Retornar contato amanhã", nextActionAt: tomorrowAt(), lastContactAt: now });
    if (type === "soon") setDraft({ ...draft, contactStatus: "call_soon", nextAction: "Ligar daqui pouco", nextActionAt: plusHours(1), lastContactAt: now });
    if (type === "sold") setDraft({ ...draft, contactStatus: "sold", temperature: "hot", lastContactAt: now, nextAction: "Converter em venda" });
  }

  async function saveLead() {
    if (!draft) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Não foi possível salvar o lead.");
      const saved = payload.lead as LeadRecord;
      setLead(saved);
      setDraft(toEditable(saved));
      setMessage("Arquivo do lead salvo no Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao salvar lead.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
        <div className="flex items-center gap-3">
          <Link href="/pipeline" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black uppercase text-white/72 transition hover:text-white">
            <ArrowLeft size={16} /> Voltar para lista
          </Link>
          <p className="text-xs text-white/46">Arquivo completo do lead em página própria, sem poluir a lista.</p>
        </div>
      </div>

      <TacticalPanel glow="purple" className="p-5">
        {isLoading ? (
          <div className="grid min-h-[280px] place-items-center"><p className="text-sm text-white/60">Carregando arquivo do lead...</p></div>
        ) : lead && draft && summary ? (
          <div>
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Arquivo do lead</p>
                <h2 className="mt-2 text-2xl font-black uppercase text-white">{lead.customerName}</h2>
                <p className="mt-1 text-sm text-white/54">Preencha sem confusão: dados, temperatura, status, retorno e histórico ficam guardados nesse arquivo.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag className={tempClass(summary.temperature)}>{tempLabel[summary.temperature]}</Tag>
                <Tag className={statusClass(summary.status)}>{statusLabel[summary.status]}</Tag>
                <Tag className="border-purple/25 bg-purple/10 text-purple">{priorityLabel[summary.priority]}</Tag>
                <Tag className="border-money/25 bg-money/10 text-money">{formatBRL(summary.value)}</Tag>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <InfoStrip label="Telefone" value={draft.customerPhone || "Sem telefone"} />
              <InfoStrip label="Cidade" value={draft.city || "Sem cidade"} />
              <InfoStrip label="Próxima ação" value={draft.nextAction || "Não definida"} />
              <InfoStrip label="Retorno" value={safeDateLabel(draft.nextActionAt)} />
              <InfoStrip label="Vendedor" value={draft.sellerName || defaultLeadSeller} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-3">
              <QuickAction onClick={() => applyQuickPreset("answered")}>Atendeu</QuickAction>
              <QuickAction onClick={() => applyQuickPreset("no_answer")}>Não atendeu</QuickAction>
              <QuickAction onClick={() => applyQuickPreset("soon")}>Ligar daqui pouco</QuickAction>
              <QuickAction onClick={() => applyQuickPreset("tomorrow")}>Retornar amanhã</QuickAction>
              <QuickAction onClick={() => applyQuickPreset("sold")} tone="money">Comprou</QuickAction>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <section className={sectionClass}>
                <SectionHeading title="Dados do contato" subtitle="Identificação e localização." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Nome"><input className={inputClass} value={draft.customerName} onChange={(e) => updateDraft("customerName", e.target.value)} /></Field>
                  <Field label="Telefone"><input className={inputClass} value={draft.customerPhone} onChange={(e) => updateDraft("customerPhone", e.target.value)} /></Field>
                  <Field label="Cidade"><input className={inputClass} value={draft.city || ""} onChange={(e) => updateDraft("city", e.target.value)} /></Field>
                  <Field label="Bairro"><input className={inputClass} value={draft.neighborhood || ""} onChange={(e) => updateDraft("neighborhood", e.target.value)} /></Field>
                  <div className="md:col-span-2"><Field label="Endereço"><input className={inputClass} value={draft.address || ""} onChange={(e) => updateDraft("address", e.target.value)} placeholder="Rua, número, referência" /></Field></div>
                  <Field label="Origem"><input className={inputClass} value={draft.source || ""} onChange={(e) => updateDraft("source", e.target.value)} placeholder="Instagram, indicação, anúncio..." /></Field>
                  {isAdmin ? (
                    <Field label="Vendedor"><select className={inputClass} value={draft.sellerName || defaultLeadSeller} onChange={(e) => updateDraft("sellerName", normalizeLeadSeller(e.target.value))}>{leadSellerOptions.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></Field>
                  ) : (
                    <Field label="Vendedor"><input className={inputClass} value={profile?.sellerDisplayName || draft.sellerName || ""} readOnly /></Field>
                  )}
                </div>
              </section>

              <section className={sectionClass}>
                <SectionHeading title="Qualificação e retorno" subtitle="Temperatura, status e próximo passo." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Temperatura"><select className={inputClass} value={draft.temperature || "hot"} onChange={(e) => updateDraft("temperature", e.target.value as LeadTemperature)}><option value="hot">Quente</option><option value="warm">Morno</option><option value="cold">Frio</option></select></Field>
                  <Field label="Status"><select className={inputClass} value={draft.contactStatus || "new"} onChange={(e) => updateDraft("contactStatus", e.target.value as LeadContactStatus)}><option value="new">Novo lead</option><option value="answered">Atendeu</option><option value="not_answered">Não atendeu</option><option value="called_no_answer">Liguei e não respondeu</option><option value="scheduled">Pré-agendou</option><option value="call_soon">Ligar daqui pouco</option><option value="return_tomorrow">Retornar amanhã</option><option value="proposal_sent">Proposta enviada</option><option value="sold">Comprou</option><option value="lost">Perdido</option></select></Field>
                  <Field label="Prioridade"><select className={inputClass} value={draft.priority || "high"} onChange={(e) => updateDraft("priority", e.target.value as LeadPriority)}><option value="critical">Crítica</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select></Field>
                  <Field label="Valor estimado"><input className={inputClass} type="number" min={0} step="0.01" value={draft.estimatedValue || ""} onChange={onMoney} /></Field>
                  <Field label="Próxima ação"><input className={inputClass} value={draft.nextAction || ""} onChange={(e) => updateDraft("nextAction", e.target.value)} placeholder="Ex: ligar 15h" /></Field>
                  <Field label="Retorno"><input className={inputClass} type="datetime-local" value={draft.nextActionAt || ""} onChange={(e) => updateDraft("nextActionAt", e.target.value)} /></Field>
                  <Field label="Último contato"><input className={inputClass} type="datetime-local" value={draft.lastContactAt || ""} onChange={(e) => updateDraft("lastContactAt", e.target.value)} /></Field>
                </div>
              </section>

              <section className={cn(sectionClass, "xl:col-span-2")}>
                <SectionHeading title="Contexto e histórico" subtitle="Tudo que antes ficava espalhado no Sheets." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Objeções"><textarea className={cn(inputClass, "min-h-24 resize-none")} value={draft.objections || ""} onChange={(e) => updateDraft("objections", e.target.value)} placeholder="Preço, entrega, confiança..." /></Field>
                  <Field label="Histórico de follow-up"><textarea className={cn(inputClass, "min-h-24 resize-none")} value={draft.followUpHistory || ""} onChange={(e) => updateDraft("followUpHistory", e.target.value)} placeholder="07/05 liguei, pediu retorno..." /></Field>
                  <div className="md:col-span-2"><Field label="Observações livres"><textarea className={cn(inputClass, "min-h-28 resize-none")} value={draft.notes || ""} onChange={(e) => updateDraft("notes", e.target.value)} placeholder="Tudo que importa sobre esse lead." /></Field></div>
                </div>
              </section>
            </div>

            {message ? <div className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-sm font-bold text-cyan">{message}</div> : null}

            <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-md">
              <p className="text-xs leading-5 text-white/52">Ao vender, marque como <b className="text-money">Comprou</b> e depois registre a venda.</p>
              <TacticalButton tone="money" onClick={saveLead} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar arquivo do lead"}</TacticalButton>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center text-center">
            <div>
              <BrainCircuit className="mx-auto h-12 w-12 text-cyan" />
              <h2 className="mt-4 text-2xl font-black uppercase text-white">Lead não encontrado</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/55">Volte para a lista e abra um lead válido.</p>
            </div>
          </div>
        )}
      </TacticalPanel>
    </div>
  );
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex rounded-lg border px-2 py-1 text-[10px] font-black uppercase", className)}>{children}</span>;
}

function InfoStrip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/38">{label}</p><p className="mt-2 truncate text-sm font-bold text-white/85">{value}</p></div>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="text-sm font-black text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/48">{subtitle}</p></div>;
}

function QuickAction({ children, onClick, tone = "default" }: { children: ReactNode; onClick: () => void; tone?: "default" | "money" }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border px-3 py-2 text-xs font-black uppercase transition", tone === "money" ? "border-money/25 bg-money/10 text-money hover:bg-money/15" : "border-white/10 bg-white/[.04] text-white/68 hover:text-white")}>{children}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className={labelClass}>{label}</label>{children}</div>;
}
