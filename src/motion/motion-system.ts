import type { Variants } from "framer-motion";

export const motionTiming = {
  fast: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  base: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  cinematic: { duration: 0.72, ease: [0.16, 1, 0.3, 1] }
} as const;

export const panelReveal: Variants = {
  hidden: { opacity: 0, y: 18, scale: .985, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: motionTiming.cinematic }
};

export const livePulse: Variants = {
  calm: { boxShadow: "0 0 0 rgba(24,255,139,0)" },
  live: {
    boxShadow: ["0 0 0 rgba(24,255,139,0)", "0 0 34px rgba(24,255,139,.22)", "0 0 0 rgba(24,255,139,0)"],
    transition: { repeat: Infinity, duration: 2.4 }
  }
};

export const riskPulse: Variants = {
  calm: { boxShadow: "0 0 0 rgba(255,59,79,0)" },
  critical: {
    boxShadow: ["0 0 0 rgba(255,59,79,0)", "0 0 42px rgba(255,59,79,.36)", "0 0 0 rgba(255,59,79,0)"],
    transition: { repeat: Infinity, duration: 1.6 }
  }
};
