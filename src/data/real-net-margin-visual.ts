export type MarginVisualTone = "loss" | "critical" | "attention" | "positive" | "kau" | "empty";

export type MarginVisualState = {
  tone: MarginVisualTone;
  levelPercent: number;
  liquidStart: string;
  liquidEnd: string;
  glow: string;
  accent: string;
};

type MarginVisualBand = {
  minimum: number;
  tone: Exclude<MarginVisualTone, "loss" | "empty">;
  liquidStart: string;
  liquidEnd: string;
  glow: string;
  accent: string;
};

// Faixas exclusivamente visuais. Não representam meta nem julgamento financeiro.
export const marginVisualBands: MarginVisualBand[] = [
  { minimum: 40, tone: "kau", liquidStart: "#22f59b", liquidEnd: "#00b96b", glow: "rgba(24,255,139,.42)", accent: "#22f59b" },
  { minimum: 25, tone: "positive", liquidStart: "#21e6b2", liquidEnd: "#079a83", glow: "rgba(33,230,178,.34)", accent: "#34d6b1" },
  { minimum: 10, tone: "attention", liquidStart: "#ffd56a", liquidEnd: "#d58b18", glow: "rgba(245,177,56,.32)", accent: "#f8c65c" },
  { minimum: 0, tone: "critical", liquidStart: "#ff9364", liquidEnd: "#c84d33", glow: "rgba(239,100,64,.3)", accent: "#ff8b66" }
];

const lossState: MarginVisualState = {
  tone: "loss",
  levelPercent: 0,
  liquidStart: "#ef5b6f",
  liquidEnd: "#7e1d36",
  glow: "rgba(239,68,88,.28)",
  accent: "#fb7185"
};

const emptyState: MarginVisualState = {
  tone: "empty",
  levelPercent: 0,
  liquidStart: "#64748b",
  liquidEnd: "#334155",
  glow: "rgba(100,116,139,.16)",
  accent: "#94a3b8"
};

export function getMarginVisualState(marginPercent: number | null): MarginVisualState {
  if (marginPercent === null || !Number.isFinite(marginPercent)) return emptyState;
  if (marginPercent < 0) return lossState;
  const band = marginVisualBands.find((item) => marginPercent >= item.minimum) ?? marginVisualBands.at(-1)!;
  return {
    ...band,
    levelPercent: Math.min(100, Math.max(0, marginPercent))
  };
}
