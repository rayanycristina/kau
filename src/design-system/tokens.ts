export const tokens = {
  color: {
    surface: {
      base: "#05070D",
      raised: "rgba(12,18,31,.82)",
      glass: "rgba(8,13,24,.64)",
      line: "rgba(255,255,255,.10)"
    },
    semantic: {
      revenue: "#18FF8B",
      intelligence: "#18D7FF",
      pending: "#FFB020",
      risk: "#FF3B4F",
      progression: "#A855F7"
    }
  },
  radius: { card: 18, panel: 24, dock: 22, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  motion: {
    instant: .12,
    fast: .18,
    base: .28,
    deliberate: .48,
    cinematic: .82
  }
} as const;
