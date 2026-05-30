"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useOperationStore } from "@/store/operation-store";
import { brl } from "@/lib/utils";

const bars = [38, 66, 52, 72, 58, 43, 81, 61, 70, 55, 88, 62, 50, 73, 60, 44];

function RevenueReactorInner() {
  const dailyRevenue = useOperationStore((s) => s.dailyRevenue);

  return (
    <div className="layout-contain gpu-layer relative h-[206px] overflow-hidden rounded-[26px] border border-money/18 bg-[radial-gradient(circle_at_50%_42%,rgba(24,255,139,.24),transparent_26%),linear-gradient(180deg,rgba(10,19,24,.72),rgba(5,7,13,.90))] shadow-panel">
      <div className="absolute inset-0 bg-tactical-lines bg-[size:34px_34px] opacity-[0.13]" />
      <div className="reactor-orbit-fast absolute left-1/2 top-1/2 h-[440px] w-[440px] rounded-full border border-money/10" />
      <div className="reactor-orbit-slow absolute left-1/2 top-1/2 h-[300px] w-[300px] rounded-full border border-cyan/10" />
      <div className="reactor-pulse absolute left-1/2 top-1/2 h-[150px] w-[150px] rounded-full border border-money/20 bg-money/10 blur-sm" />
      <div className="absolute inset-x-14 top-10 flex h-[92px] items-end justify-between">
        {bars.map((height, index) => (
          <span
            key={index}
            className="reactor-bar w-2 rounded-t-full bg-gradient-to-t from-money/15 via-money to-cyan shadow-glowGreen"
            style={{ height, animationDuration: `${1.8 + index * 0.06}s`, animationDelay: `${index * 0.05}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center">
        <motion.div
          whileHover={{ scale: 1.025 }}
          className="relative rounded-3xl border border-money/35 bg-black/55 px-11 py-4 text-center shadow-glowGreen backdrop-blur-2xl"
        >
          <div className="absolute -inset-1 rounded-3xl border border-money/15 blur-sm" />
          <div className="relative flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-money/80">
            <Zap size={13} /> Money Pulse
          </div>
          <p className="relative mt-1 text-4xl font-black leading-none text-money money-text">{brl(dailyRevenue)}</p>
          <p className="relative mt-1 text-[10px] font-black uppercase tracking-[.18em] text-white/55">+R$ 920 nos últimos 17min</p>
        </motion.div>
      </div>
      <div className="absolute left-5 top-5 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan">Reator operacional</div>
      <div className="absolute bottom-5 right-5 rounded-full border border-money/20 bg-money/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-money">Fluxo ativo</div>
    </div>
  );
}

export const RevenueReactor = memo(RevenueReactorInner);
