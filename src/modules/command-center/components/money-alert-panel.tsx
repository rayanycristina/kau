"use client";

import { motion } from "framer-motion";
import { CalendarClock, MessageSquare, PhoneCall, ShieldAlert, X } from "lucide-react";
import { moneyAlerts } from "@/data/alpha-sin-operation";
import { brl } from "@/lib/utils";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { TacticalButton } from "@/components/ui/tactical-button";

export function MoneyAlertPanel() {
  const total = moneyAlerts.reduce((sum, alert) => sum + alert.amount, 0);

  return (
    <TacticalPanel glow="red" className="col-span-4 h-[355px] overflow-hidden p-4">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-danger"><ShieldAlert size={20} /><h2 className="text-lg font-black uppercase">Money Alert</h2></div>
          <p className="text-xs text-white/48">Dinheiro parado · ação necessária</p>
        </div>
        <button className="rounded-full p-1 text-danger transition hover:bg-danger/10"><X size={18} /></button>
      </header>
      <div className="mt-4 grid grid-cols-[148px_1fr] gap-4">
        <div className="relative grid h-[188px] place-items-center">
          <div className="money-alert-ring absolute inset-2 rounded-full border border-danger/35 shadow-glowRed" />
          <div className="money-alert-glow absolute inset-0 rounded-full bg-danger/12 blur-md" />
          <div className="relative text-center">
            <p className="text-3xl font-black leading-none text-danger danger-text">{brl(total)}</p>
            <p className="mt-2 text-xs text-danger">esfriando agora</p>
            <p className="mt-2 rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-[10px] font-black uppercase text-danger">23min até perda provável</p>
          </div>
        </div>
        <div className="space-y-2">
          {moneyAlerts.map((alert) => (
            <motion.button key={alert.id} whileHover={{ x: -3 }} className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-left transition hover:border-danger/35 hover:bg-danger/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black">{alert.title}</p>
                <span className="font-mono text-xs text-white/55">{alert.age}</span>
              </div>
              <p className="mt-1 text-xs text-white/50">{brl(alert.amount)} · {alert.reason}</p>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <TacticalButton tone="money" icon={PhoneCall} className="py-2.5">Ligar agora</TacticalButton>
        <TacticalButton tone="cyan" icon={MessageSquare} className="py-2.5">Enviar msg</TacticalButton>
        <TacticalButton tone="amber" icon={CalendarClock} className="py-2.5">Reagendar</TacticalButton>
      </div>
    </TacticalPanel>
  );
}
