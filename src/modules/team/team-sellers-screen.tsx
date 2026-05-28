"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, ShieldCheck, UsersRound } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { defaultSellers } from "@/data/sellers";
import type { SellerProfile } from "@/data/sales-types";

const sellerStorageKey = "kau:sellers:v1";

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function loadSellers() {
  if (typeof window === "undefined") return defaultSellers;
  const stored = localStorage.getItem(sellerStorageKey);
  if (!stored) {
    localStorage.setItem(sellerStorageKey, JSON.stringify(defaultSellers));
    return defaultSellers;
  }
  try {
    const parsed = JSON.parse(stored) as SellerProfile[];
    return parsed.length ? parsed : defaultSellers;
  } catch {
    return defaultSellers;
  }
}

export function TeamSellersScreen() {
  const [sellers, setSellers] = useState<SellerProfile[]>(defaultSellers);

  useEffect(() => {
    setSellers(loadSellers());
  }, []);

  const activeSellers = useMemo(() => sellers.filter((seller) => seller.active !== false), [sellers]);

  return (
    <div className="space-y-5 pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,9,16,.96),rgba(9,18,28,.9)_48%,rgba(40,16,71,.62))] p-6 shadow-[0_24px_90px_rgba(0,0,0,.4)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-purple/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-purple"><UsersRound size={13} /> Equipe / Vendedores</div>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">Configuração comercial</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">Área separada para comissão, vendedores e regras. A tela de Vendas fica limpa para operação.</p>
          </div>
          <div className="rounded-2xl border border-money/20 bg-money/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Regra KAU</p>
            <p className="text-xl font-black text-money">10% sobre vendas de vendedores</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <TacticalPanel glow="money" className="p-5">
          <Crown className="text-money" size={24} />
          <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-money">Dono da operação</p>
          <h2 className="mt-2 text-2xl font-black text-white">Gabriel Moreira</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">Venda própria não gera adicional KAU. Vendas feitas por vendedoras geram seu ganho de 10% sobre o faturamento.</p>
        </TacticalPanel>

        <TacticalPanel glow="purple" className="p-5">
          <ShieldCheck className="text-purple" size={24} />
          <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-purple">Comissão da equipe</p>
          <h2 className="mt-2 text-2xl font-black text-white">Individual por vendedor</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">Rayany pode ter 15%, Elisangela 5%, e cada novo vendedor pode ter sua porcentagem própria.</p>
        </TacticalPanel>

        <TacticalPanel glow="cyan" className="p-5">
          <UsersRound className="text-cyan" size={24} />
          <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-cyan">Vendedores ativos</p>
          <h2 className="mt-2 text-2xl font-black text-white">{activeSellers.length}</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">Esta versão já lê os vendedores configurados no navegador. Edição completa entra na próxima etapa.</p>
        </TacticalPanel>
      </section>

      <TacticalPanel glow="money" className="p-5">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-money">Tabela de vendedores</p>
            <p className="mt-1 text-sm text-white/52">Referência de comissão usada na tela de Vendas.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/52">SaaS Admin · separado da operação</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="grid grid-cols-[1.1fr_.8fr_.6fr_.8fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-white/35">
            <span>Vendedor</span><span>Login</span><span>Comissão</span><span>Exemplo em R$ 1.000</span>
          </div>
          {sellers.map((seller) => (
            <div key={seller.login} className="grid grid-cols-[1.1fr_.8fr_.6fr_.8fr] gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 hover:bg-white/[.025]">
              <div><p className="font-black text-white">{seller.name}</p><p className="text-xs text-white/42">{seller.active === false ? "Inativo" : "Ativo"}</p></div>
              <p className="text-sm font-bold text-white/62">{seller.login}</p>
              <p className="text-sm font-black text-money">{seller.commissionPercent}%</p>
              <p className="text-sm font-black text-cyan">{brl(1000 * (seller.commissionPercent / 100))}</p>
            </div>
          ))}
        </div>
      </TacticalPanel>
    </div>
  );
}
