"use client";

import { useState } from "react";
import { Bell, Command, Expand, Search, Trash2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { motion } from "framer-motion";
import { useNotificationStore } from "@/store/notification-store";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "agora";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function Topbar({ title = "Command Center", subtitle = "Visão geral da operação em tempo real" }: { title?: string; subtitle?: string }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const notificationCount = notifications.length;

  return (
    <header className="relative z-20 flex h-[76px] items-center justify-between px-5">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-white/58">{subtitle}</p> : null}
      </div>
      <div className="relative flex items-center gap-3">
        <button className="rounded-2xl border border-white/10 bg-white/[.04] px-5 py-3 text-sm text-white/80 backdrop-blur-xl">Hoje</button>
        <StatusPill variant="live" pulse>Ao vivo</StatusPill>
        {[Search, Expand, Command].map((Icon, index) => (
          <motion.button key={index} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.96 }} className="rounded-full border border-white/10 bg-white/[.04] p-3 text-white/70 backdrop-blur-xl hover:border-cyan/25 hover:text-cyan"><Icon size={19} /></motion.button>
        ))}

        <div className="relative">
          <motion.button
            type="button"
            aria-label="Abrir notificações"
            onClick={() => setNotificationsOpen((open) => !open)}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative rounded-full border border-white/10 bg-white/[.04] p-3 text-white/70 backdrop-blur-xl hover:border-danger/25 hover:text-danger"
          >
            <Bell size={19} />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 text-center text-[10px] font-black text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </motion.button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-14 z-50 w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#07131c]/98 shadow-[0_24px_90px_rgba(0,0,0,.72)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Notificações</p>
                  <p className="mt-1 text-xs text-white/45">{notificationCount} evento{notificationCount === 1 ? "" : "s"} na sessão</p>
                </div>
                <button
                  type="button"
                  onClick={clearNotifications}
                  disabled={notificationCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[11px] font-black uppercase text-white/55 transition hover:text-white disabled:opacity-35"
                >
                  <Trash2 size={14} /> Limpar
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/55">
                    Nenhuma notificação ainda. Quando um pedido for gerado, ele aparece aqui.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-white/58">{item.message}</p>
                        </div>
                        <span className="shrink-0 rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-[10px] font-black text-white/42">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
