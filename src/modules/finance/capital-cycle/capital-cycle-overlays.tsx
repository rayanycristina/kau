import { useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import type { CapitalCycleRow } from "@/data/capital-cycle";
import { isPaymentConfirmed, isSaleDelivered } from "@/data/sale-financial-state";
import type { CapitalCycleResponse } from "./types";
import { money, originLabel, stageLabel } from "./types";
import { Drawer, InlineNotice, TimelineStep } from "./capital-cycle-ui";

export function SettingsDrawer({ settings, onSaved, onClose }: { settings: CapitalCycleResponse["settings"]; onSaved: () => void; onClose: () => void }) {
  const [value, setValue] = useState(settings.delinquencyDaysAfterDelivery?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/capital-cycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delinquencyDaysAfterDelivery: value ? Number(value) : null })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar a regra.");
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title="Regra de inadimplência" subtitle="Defina quando uma venda entregue e não paga passa a ser considerada inadimplente." onClose={onClose}>
      <div className="flex flex-1 flex-col">
        <div className="p-6">
          <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/42">Dias após a entrega sem pagamento</span><input className="mt-3 h-12 w-full border-b border-white/[.14] bg-black/20 px-3 text-sm text-white/78 placeholder:text-white/30 focus:border-purple/45 focus:outline-none" type="number" min="1" max="3650" step="1" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Não configurada" /></label>
          <p className="mt-2 text-[11px] leading-5 text-white/42">Deixe vazio para desativar. Nenhum prazo é presumido pelo sistema.</p>
          <div className="mt-6 border-l-2 border-amber/55 bg-amber/[.035] p-4 text-[11px] leading-5 text-white/48"><AlertTriangle size={14} className="mb-2 text-amber" />Esta regra altera somente a classificação visual de inadimplência desta análise. Pagamento continua dependendo exclusivamente de <code className="text-white/68">payment_status = paid</code>.</div>
          {settings.setupRequired ? <div className="mt-4"><InlineNotice text="A migration 032 precisa ser aplicada, após aprovação, para salvar esta configuração." /></div> : null}
          {error ? <div className="mt-4"><InlineNotice error text={error} /></div> : null}
        </div>
        <footer className="mt-auto flex justify-end gap-2 border-t border-white/[.07] p-4"><button type="button" onClick={onClose} className="h-11 px-4 text-xs font-semibold text-white/48 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">Cancelar</button><button type="button" disabled={saving || settings.setupRequired} onClick={save} className="inline-flex h-11 items-center gap-2 bg-money px-4 text-xs font-semibold text-[#02130b] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-money/50 disabled:opacity-35"><Save size={13} />{saving ? "Salvando..." : "Salvar regra"}</button></footer>
      </div>
    </Drawer>
  );
}

export function SaleTimelineDrawer({ sale, onClose }: { sale: CapitalCycleRow; onClose: () => void }) {
  const deliveryComplete = isSaleDelivered(sale);
  const paymentComplete = isPaymentConfirmed({ payment_status: sale.paymentStatus });

  return (
    <Drawer title={sale.customerName} subtitle={`${money(sale.capital)} líquidos atualmente na rua`} onClose={onClose}>
      <div className="p-5">
        <div><TimelineStep label="Comprou" date={sale.saleDate} complete={Boolean(sale.saleDate)} /><TimelineStep label="Entregou" date={deliveryComplete ? sale.deliveryDate : undefined} complete={deliveryComplete} pending="Pendente" /><TimelineStep label="Pagamento" date={paymentComplete ? sale.paymentDate : undefined} complete={paymentComplete} pending="Pendente" /></div>
        <div className="mt-5 grid grid-cols-2 gap-2"><Detail label="Dias na rua" value={sale.daysOpen == null ? "—" : `${sale.daysOpen} dias`} /><Detail label="Etapa" value={stageLabel(sale.stage)} /><Detail label="Origem" value={originLabel(sale.origin || "")} /><Detail label="Campanha" value={sale.campaignName || "Sem campanha"} /></div>
      </div>
    </Drawer>
  );
}

export function QualityReviewDrawer({ data, onClose }: { data: CapitalCycleResponse["dataQuality"]; onClose: () => void }) {
  return (
    <Drawer title="Registros para revisão" subtitle="Inconsistências reais excluídas apenas dos cálculos afetados." onClose={onClose}>
      <div className="overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between border-l-2 border-amber/55 bg-amber/[.04] px-4 py-3"><span className="text-[11px] text-white/48">Pendências encontradas</span><strong className="text-lg font-semibold text-amber tabular-nums">{data.reviewCount}</strong></div>
        <div className="divide-y divide-white/[.065]">{data.issues.map((issue, index) => <div key={`${issue.saleId}-${index}`} className="py-4"><p className="truncate text-[13px] font-semibold text-white/76" title={issue.customerName}>{issue.customerName}</p><p className="mt-1.5 flex items-start gap-2 text-[11px] leading-5 text-amber/78"><AlertTriangle size={12} className="mt-1 shrink-0" />{issue.reason}</p><p className="mt-1 text-[11px] text-white/40">ID {issue.saleId}</p></div>)}</div>
      </div>
    </Drawer>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-white/[.1] bg-white/[.018] p-3"><p className="text-[11px] font-semibold uppercase tracking-[.1em] text-white/44">{label}</p><p className="mt-1.5 truncate text-[13px] font-semibold text-white/70" title={value}>{value}</p></div>;
}
