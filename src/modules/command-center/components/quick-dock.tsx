"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  CheckCircle2,
  FilePlus2,
  MessageSquare,
  PhoneCall,
  Plus,
  ShoppingCart,
  Sparkles,
  Target,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { TacticalButton } from "@/components/ui/tactical-button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useOperationStore } from "@/store/operation-store";
import type { SaleInput, SaleRecord } from "@/data/sales-types";
import { commissionPercentToRate, commissionRateToPercent, defaultSellers, normalizeCommissionPercent } from "@/data/sellers";
import type { LeadInput, LeadRecord } from "@/data/leads-types";

type DockAction = "ai-call" | "sale" | "call" | "lead" | "message" | "follow-up" | "proposal" | "add";

type ActionConfig = {
  title: string;
  eyebrow: string;
  description: string;
  primary: string;
  impact: string;
  tone: "money" | "cyan" | "amber" | "purple" | "neutral";
  fields: Array<{ label: string; value: string }>;
};

const actionConfig: Record<Exclude<DockAction, "sale" | "lead">, ActionConfig> = {
  "ai-call": {
    title: "Ligar Maria Silva agora",
    eyebrow: "IA recomenda",
    description: "Lead quente de AlphaSin com 87% de calor comercial. A janela de resposta está aberta e o dinheiro está esfriando.",
    primary: "Iniciar ligação assistida",
    impact: "+R$ 12.500 em recuperação potencial",
    tone: "money",
    fields: [
      { label: "Lead", value: "Maria Silva" },
      { label: "Produto", value: "AlphaSin" },
      { label: "Ação sugerida", value: "Confirmar interesse + conduzir fechamento" }
    ]
  },
  call: {
    title: "Nova ligação",
    eyebrow: "Execução imediata",
    description: "Abra uma chamada operacional com escuta, score de calor e roteiro tático da IA para AlphaSin.",
    primary: "Abrir Live Call Copilot",
    impact: "Copiloto pronto para monitorar objeções",
    tone: "money",
    fields: [
      { label: "Destino", value: "Lead quente / número manual" },
      { label: "Roteiro", value: "Fechamento AlphaSin" },
      { label: "Meta", value: "Venda ou reagendamento confirmado" }
    ]
  },
  message: {
    title: "Enviar mensagem",
    eyebrow: "Resposta tática",
    description: "Gere uma mensagem persuasiva com contexto de compra, objeção provável e CTA de fechamento.",
    primary: "Gerar mensagem com IA",
    impact: "Mensagem pronta para WhatsApp",
    tone: "cyan",
    fields: [
      { label: "Modelo", value: "Confirmação AlphaSin" },
      { label: "Tom", value: "Direto, humano e urgente" },
      { label: "CTA", value: "Confirmar pedido agora" }
    ]
  },
  "follow-up": {
    title: "Agendar follow-up",
    eyebrow: "Máquina de follow-up",
    description: "Crie um retorno com pressão operacional, timer de risco e alerta se o lead começar a esfriar.",
    primary: "Agendar missão",
    impact: "Evita perda por esquecimento",
    tone: "purple",
    fields: [
      { label: "Prazo", value: "Hoje, próxima janela quente" },
      { label: "Motivo", value: "Retorno comercial AlphaSin" },
      { label: "Escalação", value: "Crítico se atrasar 15min" }
    ]
  },
  proposal: {
    title: "Nova proposta",
    eyebrow: "Fechamento assistido",
    description: "Monte uma proposta AlphaSin com valor, condição, risco de COD/PAD e próxima ação de confirmação.",
    primary: "Criar proposta",
    impact: "R$ 3.980 estimados em negociação",
    tone: "amber",
    fields: [
      { label: "Produto", value: "AlphaSin" },
      { label: "Condição", value: "Oferta comercial atual" },
      { label: "Confirmação", value: "Mensagem + ligação" }
    ]
  },
  add: {
    title: "Adicionar ação operacional",
    eyebrow: "Comando rápido",
    description: "Crie qualquer tarefa tática e prenda ela ao fluxo operacional do Command Center.",
    primary: "Adicionar ao cockpit",
    impact: "Aparece como missão rastreável",
    tone: "neutral",
    fields: [
      { label: "Tipo", value: "Tarefa / nota / contato" },
      { label: "Prioridade", value: "Normal" },
      { label: "Responsável", value: "Gabriel ou Elisangela" }
    ]
  }
};

const toneRing = {
  money: "border-money/35 bg-money/10 text-money",
  cyan: "border-cyan/35 bg-cyan/10 text-cyan",
  amber: "border-amber/35 bg-amber/10 text-amber",
  purple: "border-purple/35 bg-purple/10 text-purple",
  neutral: "border-white/10 bg-white/[.06] text-white/75"
};

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/26 focus:border-money/40 focus:bg-money/[.045] focus:shadow-[0_0_0_3px_rgba(0,255,136,.08)]";
const labelClass = "mb-2 block text-[10px] font-black uppercase tracking-[.22em] text-white/42";

const initialSale: SaleInput = {
  customerName: "",
  customerPhone: "",
  city: "",
  productName: "AlphaSin",
  quantity: 1,
  totalAmount: 0,
  sellerName: "Rayany",
  commissionRate: commissionPercentToRate(15),
  paymentMethod: "Pix",
  paymentStatus: "paid",
  deliveryType: "Entrega padrão",
  deliveryStatus: "pending",
  expectedPaymentDate: "",
  notes: ""
};

const initialLead: LeadInput = {
  customerName: "",
  customerPhone: "",
  city: "",
  address: "",
  neighborhood: "",
  productName: "AlphaSin",
  temperature: "hot",
  contactStatus: "new",
  priority: "high",
  sellerName: "Gabriel Moreira",
  nextAction: "Qualificar e conduzir para venda AlphaSin",
  nextActionAt: "",
  estimatedValue: 197,
  source: "Manual KAU",
  notes: "",
  objections: "",
  followUpHistory: ""
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function QuickDock() {
  const { profile, isSeller } = useAuth();
  const [activeAction, setActiveAction] = useState<DockAction | null>(null);
  const [completedAction, setCompletedAction] = useState<string | null>(null);
  const [sale, setSale] = useState<SaleInput>(initialSale);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [lead, setLead] = useState<LeadInput>(initialLead);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const registerSale = useOperationStore((s) => s.registerSale);
  const activeConfig = useMemo(() => (activeAction && activeAction !== "sale" && activeAction !== "lead" ? actionConfig[activeAction] : null), [activeAction]);

  useEffect(() => {
    if (!profile || !isSeller) return;
    setSale((current) => ({
      ...current,
      sellerName: profile.sellerDisplayName,
      commissionRate: commissionPercentToRate(profile.commissionPercent)
    }));
    setLead((current) => ({ ...current, sellerName: profile.sellerDisplayName }));
  }, [profile, isSeller]);
  const commissionPercent = commissionRateToPercent(Number(sale.commissionRate || 5));
  const commissionPreview = Number.isFinite(Number(sale.totalAmount)) ? Number(sale.totalAmount) * (commissionPercent / 100) : 0;

  function updateSaleField<K extends keyof SaleInput>(field: K, value: SaleInput[K]) {
    setSale((current) => ({ ...current, [field]: value }));
  }

  function updateLeadField<K extends keyof LeadInput>(field: K, value: LeadInput[K]) {
    setLead((current) => ({ ...current, [field]: value }));
  }


  function handleSaleNumber(event: ChangeEvent<HTMLInputElement>, field: "quantity" | "totalAmount") {
    const value = field === "quantity" ? Number.parseInt(event.target.value || "0", 10) : Number(event.target.value || 0);
    updateSaleField(field, value as SaleInput[typeof field]);
  }

  function completeAction() {
    if (!activeConfig) return;
    setCompletedAction(activeConfig.title);
    setActiveAction(null);
    window.setTimeout(() => setCompletedAction(null), 2600);
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaleError(null);
    setIsSavingSale(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sale)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel registrar a venda.");
      }

      const savedSale = payload.sale as SaleRecord;
      registerSale(savedSale);
      setCompletedAction(`Venda registrada: ${savedSale.customerName} · ${formatBRL(savedSale.totalAmount)}`);
      setActiveAction(null);
      setSale(initialSale);
      window.setTimeout(() => setCompletedAction(null), 3400);
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : "Erro desconhecido ao registrar venda.");
    } finally {
      setIsSavingSale(false);
    }
  }


  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadError(null);
    setIsSavingLead(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(lead)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel cadastrar o lead.");
      }

      const savedLead = payload.lead as LeadRecord;
      setCompletedAction(`Lead cadastrado: ${savedLead.customerName} · ${savedLead.customerPhone}`);
      setActiveAction(null);
      setLead(initialLead);
      window.setTimeout(() => setCompletedAction(null), 3400);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "Erro desconhecido ao cadastrar lead.");
    } finally {
      setIsSavingLead(false);
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-30 flex justify-center">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center gap-2 rounded-3xl border border-white/10 bg-black/55 px-4 py-3 shadow-[0_18px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl"
        >
          <button
            type="button"
            onClick={() => setActiveAction("ai-call")}
            className="group mr-2 hidden cursor-pointer items-center gap-2 border-r border-white/10 pr-4 text-left text-xs text-white/48 transition hover:text-white xl:flex"
            aria-label="Executar recomendação da IA"
          >
            <Sparkles size={15} className="text-cyan transition group-hover:scale-110" />
            <div>
              <p className="font-black uppercase text-white/70">IA recomenda</p>
              <p>Ligar Maria Silva agora</p>
            </div>
          </button>
          <TacticalButton tone="money" icon={ShoppingCart} className="py-2.5" onClick={() => setActiveAction("sale")}>Registrar Venda</TacticalButton>
          <TacticalButton tone="money" icon={PhoneCall} className="py-2.5" onClick={() => setActiveAction("call")}>Nova Ligação</TacticalButton>
          <TacticalButton tone="cyan" icon={Target} className="py-2.5" onClick={() => setActiveAction("lead")}>Cadastrar Lead</TacticalButton>
          <TacticalButton tone="cyan" icon={MessageSquare} className="py-2.5" onClick={() => setActiveAction("message")}>Enviar Mensagem</TacticalButton>
          <TacticalButton tone="purple" icon={CalendarPlus} className="py-2.5" onClick={() => setActiveAction("follow-up")}>Agendar Follow-up</TacticalButton>
          <TacticalButton tone="amber" icon={FilePlus2} className="py-2.5" onClick={() => setActiveAction("proposal")}>Nova Proposta</TacticalButton>
          <TacticalButton tone="neutral" icon={Plus} className="py-2.5" onClick={() => setActiveAction("add")}>Adicionar</TacticalButton>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeAction === "sale" ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-20 backdrop-blur-sm md:items-center md:pb-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setActiveAction(null)}
          >
            <motion.form
              onSubmit={submitSale}
              role="dialog"
              aria-modal="true"
              aria-label="Registrar Venda AlphaSin"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ y: 28, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-money/20 bg-obsidian/96 p-6 shadow-[0_30px_120px_rgba(0,0,0,.78)] backdrop-blur-2xl"
            >
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-money/10 blur-3xl" />
              <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.32em] text-money">Venda AlphaSin</p>
                  <h2 className="mt-2 text-3xl font-black text-white">Registrar venda</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                    Salva no Supabase, atualiza o Money Pulse, recalcula comissão configurável e alimenta produtividade diária da operação.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-white/55 transition hover:bg-white/[.08] hover:text-white"
                  aria-label="Fechar registro de venda"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Cliente</label>
                  <input className={inputClass} value={sale.customerName} onChange={(e) => updateSaleField("customerName", e.target.value)} placeholder="Nome do cliente" required />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input className={inputClass} value={sale.customerPhone} onChange={(e) => updateSaleField("customerPhone", e.target.value)} placeholder="WhatsApp / telefone" />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input className={inputClass} value={sale.city} onChange={(e) => updateSaleField("city", e.target.value)} placeholder="Cidade do cliente" required />
                </div>
                <div>
                  <label className={labelClass}>Vendedor</label>
                  {isSeller ? (
                    <input className={inputClass} value={sale.sellerName} readOnly />
                  ) : (
                    <select className={inputClass} value={sale.sellerName} onChange={(e) => {
                      const seller = defaultSellers.find((item) => item.name === e.target.value);
                      updateSaleField("sellerName", e.target.value);
                      if (seller) updateSaleField("commissionRate", commissionPercentToRate(seller.commissionPercent));
                    }}>
                      {defaultSellers.map((seller) => <option key={seller.login}>{seller.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Quantidade</label>
                  <input className={inputClass} type="number" min={1} value={sale.quantity} onChange={(e) => handleSaleNumber(e, "quantity")} required />
                </div>
                <div>
                  <label className={labelClass}>Valor total</label>
                  <input className={inputClass} type="number" min={1} step="0.01" value={sale.totalAmount || ""} onChange={(e) => handleSaleNumber(e, "totalAmount")} placeholder="Ex: 850" required />
                </div>
                <div>
                  <label className={labelClass}>Comissão %</label>
                  <input className={inputClass} type="number" min={0} step="0.01" value={commissionPercent || ""} onChange={(e) => updateSaleField("commissionRate", commissionPercentToRate(normalizeCommissionPercent(e.target.value, 5)))} />
                </div>
                <div>
                  <label className={labelClass}>Forma de pagamento</label>
                  <select className={inputClass} value={sale.paymentMethod} onChange={(e) => updateSaleField("paymentMethod", e.target.value)}>
                    <option>Pix</option>
                    <option>Cartão</option>
                    <option>Dinheiro</option>
                    <option>COD/PAD</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status do pagamento</label>
                  <select className={inputClass} value={sale.paymentStatus} onChange={(e) => updateSaleField("paymentStatus", e.target.value as SaleInput["paymentStatus"])}>
                    <option value="paid">Pago</option>
                    <option value="pending">Pendente</option>
                    <option value="cod">COD/PAD</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Entrega</label>
                  <input className={inputClass} value={sale.deliveryType} onChange={(e) => updateSaleField("deliveryType", e.target.value)} placeholder="Entrega padrão / retirada / motoboy" />
                </div>
                <div>
                  <label className={labelClass}>Previsão de recebimento</label>
                  <input className={inputClass} type="date" value={sale.expectedPaymentDate} onChange={(e) => updateSaleField("expectedPaymentDate", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Observação operacional</label>
                  <textarea className={cn(inputClass, "min-h-24 resize-none")} value={sale.notes} onChange={(e) => updateSaleField("notes", e.target.value)} placeholder="Ex: cliente pediu confirmação por WhatsApp, entrega em bairro X, risco de COD/PAD..." />
                </div>
              </div>

              <div className="relative mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-money/20 bg-money/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/42">Receita registrada</p>
                  <p className="mt-2 text-2xl font-black text-money">{formatBRL(Number(sale.totalAmount || 0))}</p>
                </div>
                <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/42">Comissão</p>
                  <p className="mt-2 text-2xl font-black text-cyan">{formatBRL(commissionPreview)}</p>
                </div>
                <div className="rounded-2xl border border-amber/20 bg-amber/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/42">Destino</p>
                  <p className="mt-2 text-lg font-black text-amber">Supabase · sales</p>
                </div>
              </div>

              {saleError ? (
                <div className="relative mt-5 rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm font-bold text-red">
                  {saleError}
                </div>
              ) : null}

              <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <TacticalButton tone="neutral" type="button" onClick={() => setActiveAction(null)}>Cancelar</TacticalButton>
                <TacticalButton tone="money" type="submit" disabled={isSavingSale}>
                  {isSavingSale ? "Salvando no Supabase..." : "Confirmar venda"}
                </TacticalButton>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>


      <AnimatePresence>
        {activeAction === "lead" ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-20 md:items-center md:pb-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setActiveAction(null)}
          >
            <motion.form
              onSubmit={submitLead}
              role="dialog"
              aria-modal="true"
              aria-label="Cadastrar Lead AlphaSin"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ y: 28, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan/20 bg-[#07131c] p-6 shadow-[0_30px_120px_rgba(0,0,0,.78)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.08),transparent_42%)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.32em] text-cyan">Cadastro rápido</p>
                  <h2 className="mt-2 text-3xl font-black text-white">Cadastrar lead</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
                    Aqui é só entrada rápida. Preencha nome e telefone. Depois você completa o arquivo do lead na área de Leads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-white/55 transition hover:bg-white/[.08] hover:text-white"
                  aria-label="Fechar cadastro de lead"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative mt-7 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome</label>
                  <input className={inputClass} value={lead.customerName} onChange={(e) => updateLeadField("customerName", e.target.value)} placeholder="Nome do contato" required />
                </div>
                <div>
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input className={inputClass} value={lead.customerPhone} onChange={(e) => updateLeadField("customerPhone", e.target.value)} placeholder="DDD + número" required />
                </div>
              </div>

              <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/42">Próximo passo</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Depois de salvar, abra <span className="font-black text-cyan">Leads → Lista de leads</span> para preencher cidade, temperatura, status, retorno, endereço e observações.
                </p>
              </div>

              {leadError ? (
                <div className="relative mt-5 rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm font-bold text-red">
                  {leadError}
                </div>
              ) : null}

              <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <TacticalButton tone="neutral" type="button" onClick={() => setActiveAction(null)}>Cancelar</TacticalButton>
                <TacticalButton tone="cyan" type="submit" disabled={isSavingLead}>
                  {isSavingLead ? "Salvando lead..." : "Cadastrar lead"}
                </TacticalButton>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeConfig ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-24 backdrop-blur-sm md:items-center md:pb-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setActiveAction(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={activeConfig.title}
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ y: 28, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/12 bg-obsidian/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,.72)] backdrop-blur-2xl"
            >
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />
              <div className="absolute -bottom-24 left-12 h-60 w-60 rounded-full bg-money/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.28em] text-cyan">{activeConfig.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{activeConfig.title}</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/62">{activeConfig.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-white/55 transition hover:bg-white/[.08] hover:text-white"
                  aria-label="Fechar ação rápida"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative mt-6 grid gap-3">
                {activeConfig.fields.map((field) => (
                  <div key={field.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-[.16em] text-white/38">{field.label}</span>
                    <span className="text-right text-sm font-bold text-white/80">{field.value}</span>
                  </div>
                ))}
              </div>

              <div className={cn("relative mt-5 rounded-2xl border px-4 py-3 text-sm font-black", toneRing[activeConfig.tone])}>
                {activeConfig.impact}
              </div>

              <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <TacticalButton tone="neutral" onClick={() => setActiveAction(null)}>Cancelar</TacticalButton>
                <TacticalButton tone={activeConfig.tone} onClick={completeAction}>{activeConfig.primary}</TacticalButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {completedAction ? (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-money/25 bg-money/10 px-5 py-4 text-sm font-black text-money shadow-glowGreen backdrop-blur-xl"
          >
            <CheckCircle2 size={18} />
            {completedAction}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
