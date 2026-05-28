import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#05070D",
        graphite: "#080B12",
        petrol: "#061A21",
        steel: "#111827",
        line: "rgba(255,255,255,.10)",
        muted: "rgba(226,232,240,.62)",
        money: "#18FF8B",
        cyan: "#18D7FF",
        amber: "#FFB020",
        danger: "#FF3B4F",
        purple: "#A855F7",
        magenta: "#D946EF"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"]
      },
      boxShadow: {
        glowGreen: "0 0 34px rgba(24,255,139,.22)",
        glowCyan: "0 0 34px rgba(24,215,255,.22)",
        glowRed: "0 0 42px rgba(255,59,79,.22)",
        panel: "inset 0 1px 0 rgba(255,255,255,.08), 0 24px 80px rgba(0,0,0,.45)"
      },
      backgroundImage: {
        'radial-grid': "radial-gradient(circle at 50% 0%, rgba(24,255,139,.12), transparent 34%), radial-gradient(circle at 80% 10%, rgba(168,85,247,.16), transparent 28%), linear-gradient(180deg, #05070D 0%, #070A12 100%)",
        'tactical-lines': "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)"
      },
      keyframes: {
        moneyPulse: { "0%,100%": { opacity: ".68", transform: "scale(1)" }, "50%": { opacity: "1", transform: "scale(1.025)" } },
        scan: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        breathe: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } }
      },
      animation: {
        moneyPulse: "moneyPulse 2.4s ease-in-out infinite",
        scan: "scan 3.8s linear infinite",
        breathe: "breathe 2.8s ease-in-out infinite"
      }
    }
  },
  plugins: [animate]
};

export default config;
