"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, ChevronLeft, CircleDollarSign, Gauge, Home, MessagesSquare, PhoneCall, Settings, ShieldAlert, ShoppingCart, Swords, Target, TimerReset, Trophy, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { label: "Command Center", href: "/", icon: Home, sub: "Nervo central" },
  { label: "Live Calls", href: "/live-calls", icon: PhoneCall, badge: "AO VIVO", sub: "3 chamadas" },
  { label: "Leads", href: "/pipeline", icon: Target, count: "342", sub: "17 quentes" },
  { label: "Vendas", href: "/sales", icon: ShoppingCart, sub: "registro + comissão" },
  { label: "Sales Command", href: "/sales-command", icon: MessagesSquare, badge: "NOVO", sub: "fechamento" },
  { label: "Equipe / Vendedores", href: "/team", icon: UsersRound, sub: "comissões" },
  { label: "Follow-up", href: "/follow-up", icon: TimerReset, count: "27", alert: true, sub: "R$ 4.250" },
  { label: "Money Alert", href: "/money-alert", icon: ShieldAlert, count: "9", alert: true, sub: "R$ 12.450" },
  { label: "COD/PAD", href: "/cod-pad", icon: CircleDollarSign, count: "15", sub: "risco logístico" },
  { label: "Sales Arena", href: "/sales-arena", icon: Trophy, sub: "ranking vivo" },
  { label: "Coach AI", href: "/coach-ai", icon: Bot, sub: "evolução" },
  { label: "Relatórios", href: "/ceo-briefing", icon: BarChart3, sub: "CEO briefing" },
  { label: "Configurações", href: "/settings", icon: Settings, sub: "sistema" }
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <aside className="paint-contain relative z-20 flex h-screen w-[264px] shrink-0 flex-col border-r border-white/10 bg-black/38 p-4 backdrop-blur-2xl">
      <div className="mb-7 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Gauge className="h-9 w-9 text-money" />
          <span className="text-4xl font-black tracking-tight text-money money-text">KAU</span>
        </Link>
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} className="rounded-full border border-white/10 bg-white/[.04] p-1.5 text-white/60"><ChevronLeft size={18} /></motion.button>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <motion.div key={item.label} whileHover={{ x: 4, scale: 1.008 }} whileTap={{ scale: 0.985 }}>
              <Link
                href={item.href}
                className={cn(
                  "group relative flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold uppercase tracking-[.02em] text-white/62 transition",
                  "hover:bg-white/[.045] hover:text-white hover:shadow-panel",
                  active && "border border-money/25 bg-money/10 text-money shadow-glowGreen"
                )}
              >
                {active && <span className="absolute right-0 top-3 h-8 w-[3px] rounded-full bg-money shadow-glowGreen" />}
                <item.icon size={19} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className="block truncate text-[10px] font-medium normal-case tracking-normal text-white/36 group-hover:text-white/50">{item.sub}</span>
                </span>
                {item.alert && <span className="critical-pulse h-2 w-2 rounded-full bg-danger shadow-glowRed" />}
                {item.badge && <span className="rounded bg-danger px-1.5 py-1 text-[9px] font-black text-white">{item.badge}</span>}
                {item.count && <span className="rounded-lg bg-purple/15 px-2 py-1 text-[11px] text-white/80">{item.count}</span>}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-panel">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber/40 to-purple/30 text-sm font-black">GM</div>
            <div className="min-w-0"><p className="truncate text-sm font-bold">Gabriel Moreira</p><p className="text-xs text-white/50">Gestor Comercial</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-purple/30 bg-purple/15 px-3 py-2 text-xs font-bold uppercase text-purple"><span>Nível Élite</span><Swords size={14} /></div>
          <div className="mt-4 flex items-end justify-between text-xs"><span className="font-bold text-money">XP 24.850</span><span className="text-white/50">/ 35.000</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: "71%" }} transition={{ duration: 1.2 }} className="h-full rounded-full bg-money shadow-glowGreen" /></div>
        </div>
        <div className="rounded-2xl border border-money/15 bg-money/10 p-4 shadow-glowGreen">
          <p className="text-xs font-black uppercase text-money">Operação em alta</p>
          <p className="mt-1 text-3xl font-black text-money money-text">+18%</p>
          <p className="text-xs text-white/55">vs ontem · ritmo acelerando</p>
        </div>
      </div>
    </aside>
  );
}
