"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, tone = "money" }: { data: number[]; tone?: "money" | "danger" | "amber" | "cyan" }) {
  const stroke = { money: "#18FF8B", danger: "#FF3B4F", amber: "#FFB020", cyan: "#18D7FF" }[tone];
  return (
    <ResponsiveContainer width="100%" height={38}>
      <AreaChart data={data.map((value, index) => ({ index, value }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.38} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill={`url(#spark-${tone})`} dot={false} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  );
}
