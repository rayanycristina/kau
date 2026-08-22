"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { getMarginVisualState } from "@/data/real-net-margin-visual";
import styles from "./real-net-margin.module.css";

type TankStyle = CSSProperties & {
  "--margin-liquid-start": string;
  "--margin-liquid-end": string;
  "--margin-liquid-glow": string;
  "--margin-accent": string;
};

const VESSEL_TOP = 42;
const VESSEL_BOTTOM = 302;
const SURFACE_Y = 12;
const LIQUID_MASS_PATH = "M-190 13 C-154 7 -126 17 -92 11 C-54 4 -20 17 16 12 C52 7 82 2 116 11 C150 20 180 16 214 9 C248 2 280 17 316 12 C352 7 386 4 422 12 C454 19 486 14 520 9 L520 370 L-190 370 Z";
const TAU = Math.PI * 2;
const SURFACE_POINT_COUNT = 25;
const SURFACE_LEFT = 48;
const SURFACE_RIGHT = 232;
const SURFACE_X = Array.from(
  { length: SURFACE_POINT_COUNT },
  (_, index) => SURFACE_LEFT + ((SURFACE_RIGHT - SURFACE_LEFT) * index) / (SURFACE_POINT_COUNT - 1)
);

type SurfacePoint = { x: number; y: number };

function smoothPath(points: SurfacePoint[]) {
  if (points.length === 0) return "";

  let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = current.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (following.x - current.x) / 6;
    const controlTwoY = next.y - (following.y - current.y) / 6;
    path += ` C${controlOneX.toFixed(2)} ${controlOneY.toFixed(2)} ${controlTwoX.toFixed(2)} ${controlTwoY.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  return path;
}

function setPath(ref: React.RefObject<SVGPathElement | null>, value: string) {
  ref.current?.setAttribute("d", value);
}

export function LiquidMarginTank({
  marginPercent,
  targetMargin = null
}: {
  marginPercent: number | null;
  targetMargin?: number | null;
}) {
  const ids = useId().replace(/:/g, "");
  const visual = getMarginVisualState(marginPercent);
  const [animatedLevel, setAnimatedLevel] = useState(0);
  const liquidBodyRef = useRef<SVGPathElement>(null);
  const liquidClipRef = useRef<SVGPathElement>(null);
  const surfaceFillRef = useRef<SVGPathElement>(null);
  const surfaceDepthRef = useRef<SVGPathElement>(null);
  const surfaceCrestRef = useRef<SVGPathElement>(null);
  const surfaceHighlightRef = useRef<SVGPathElement>(null);
  const meniscusLeftRef = useRef<SVGPathElement>(null);
  const meniscusRightRef = useRef<SVGPathElement>(null);
  const previousLevelRef = useRef(visual.levelPercent);
  const levelImpulseRef = useRef({ startedAt: 0, amplitude: 0, direction: 1 });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedLevel(visual.levelPercent));
    return () => window.cancelAnimationFrame(frame);
  }, [visual.levelPercent]);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    const difference = visual.levelPercent - previousLevel;
    previousLevelRef.current = visual.levelPercent;

    if (Math.abs(difference) >= 1) {
      levelImpulseRef.current = {
        startedAt: performance.now(),
        amplitude: Math.min(3.8, 1.1 + Math.abs(difference) * 0.075),
        direction: difference >= 0 ? 1 : -1
      };
    }
  }, [visual.levelPercent]);

  useEffect(() => {
    const surfacePoints = SURFACE_X.map((x) => ({ x, y: SURFACE_Y }));
    const depthPoints = SURFACE_X.map((x) => ({ x, y: SURFACE_Y + 3 }));
    const highlightPoints = SURFACE_X.slice(3, -3).map((x) => ({ x, y: SURFACE_Y - 1 }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let lastFrameAt = 0;

    const renderSurface = (timeSeconds: number, now: number, isReduced: boolean) => {
      const impulse = levelImpulseRef.current;
      const impulseElapsed = Math.max(0, (now - impulse.startedAt) / 1000);
      const impulseEnvelope = impulse.amplitude > 0 && impulseElapsed < 2.4
        ? impulse.amplitude * Math.exp(-1.45 * impulseElapsed) * Math.sin(TAU * impulseElapsed / 1.08) * impulse.direction
        : 0;
      const slosh = isReduced
        ? 0
        : 6.3 * Math.sin(TAU * timeSeconds / 6.4)
          + 1.55 * Math.sin(TAU * timeSeconds / 9.7 + 1.2)
          + impulseEnvelope;
      let meanOffset = 0;

      for (let index = 0; index < surfacePoints.length; index += 1) {
        const normalized = index / (surfacePoints.length - 1);
        const centered = normalized * 2 - 1;
        const edgeGain = 0.72 + Math.abs(centered) * 0.28;
        const waveA = isReduced ? 0 : 2.4 * Math.sin(TAU * (normalized * 1.35 + timeSeconds / 4.15));
        const waveB = isReduced ? 0 : 1.45 * Math.sin(TAU * (normalized * 2.18 - timeSeconds / 7.25) + 1.08);
        const waveC = isReduced ? 0 : 0.78 * Math.sin(TAU * (normalized * 3.42 + timeSeconds / 11.4) + 2.32);
        const offset = slosh * centered + (waveA + waveB + waveC) * edgeGain;
        surfacePoints[index].y = SURFACE_Y + offset;
        meanOffset += offset;
      }

      meanOffset /= surfacePoints.length;
      for (let index = 0; index < surfacePoints.length; index += 1) {
        surfacePoints[index].y -= meanOffset;
        const normalized = index / (surfacePoints.length - 1);
        depthPoints[index].y = surfacePoints[index].y
          + 3.1
          + (isReduced ? 0 : 0.55 * Math.sin(TAU * (normalized * 1.7 - timeSeconds / 5.8) + 0.7));
      }

      for (let index = 0; index < highlightPoints.length; index += 1) {
        const source = surfacePoints[index + 3];
        const normalized = index / Math.max(1, highlightPoints.length - 1);
        highlightPoints[index].y = source.y
          - 1.15
          + (isReduced ? 0 : 0.42 * Math.sin(TAU * (normalized * 1.45 + timeSeconds / 6.9) + 0.4));
      }

      const surfacePath = smoothPath(surfacePoints);
      const depthPath = smoothPath(depthPoints);
      const highlightPath = smoothPath(highlightPoints);
      const liquidBodyPath = `${surfacePath} L${SURFACE_RIGHT} 370 L${SURFACE_LEFT} 370 Z`;
      const surfaceFillPath = `${surfacePath} L${SURFACE_RIGHT} 29 L${SURFACE_LEFT} 29 Z`;

      setPath(liquidBodyRef, liquidBodyPath);
      setPath(liquidClipRef, liquidBodyPath);
      setPath(surfaceFillRef, surfaceFillPath);
      setPath(surfaceDepthRef, `${depthPath} L${SURFACE_RIGHT} 30 L${SURFACE_LEFT} 30 Z`);
      setPath(surfaceCrestRef, surfacePath);
      setPath(surfaceHighlightRef, highlightPath);

      const leftY = surfacePoints[0].y;
      const rightY = surfacePoints[surfacePoints.length - 1].y;
      setPath(meniscusLeftRef, `M${SURFACE_LEFT} ${leftY.toFixed(2)} C51 ${(leftY - 4.8).toFixed(2)} 58 ${(leftY - 5.6).toFixed(2)} 66 ${(surfacePoints[2].y - 1.2).toFixed(2)}`);
      setPath(meniscusRightRef, `M214 ${(surfacePoints[surfacePoints.length - 3].y - 1.2).toFixed(2)} C222 ${(rightY - 5.6).toFixed(2)} 229 ${(rightY - 4.8).toFixed(2)} ${SURFACE_RIGHT} ${rightY.toFixed(2)}`);
    };

    const tick = (now: number) => {
      if (now - lastFrameAt >= 1000 / 30) {
        renderSurface(now / 1000, now, false);
        lastFrameAt = now;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const applyMotionPreference = () => {
      window.cancelAnimationFrame(animationFrame);
      if (reducedMotion.matches) {
        renderSurface(0, performance.now(), true);
      } else {
        lastFrameAt = 0;
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    reducedMotion.addEventListener("change", applyMotionPreference);
    applyMotionPreference();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      reducedMotion.removeEventListener("change", applyMotionPreference);
    };
  }, []);

  const vesselHeight = VESSEL_BOTTOM - VESSEL_TOP;
  const liquidTop = VESSEL_TOP - SURFACE_Y + ((100 - animatedLevel) / 100) * vesselHeight;
  const targetY = targetMargin == null
    ? null
    : VESSEL_TOP + ((100 - Math.min(100, Math.max(0, targetMargin))) / 100) * vesselHeight;
  const label = marginPercent === null
    ? "Tanque vazio: dados insuficientes para calcular a margem líquida real."
    : `Tanque de margem líquida real em ${marginPercent.toFixed(1).replace(".", ",")}%`;
  const tankStyle: TankStyle = {
    "--margin-liquid-start": visual.liquidStart,
    "--margin-liquid-end": visual.liquidEnd,
    "--margin-liquid-glow": visual.glow,
    "--margin-accent": visual.accent
  };

  return (
    <figure
      className={styles.tankFigure}
      data-tone={visual.tone}
      data-level={visual.levelPercent}
      style={tankStyle}
      title={label}
      role="img"
      aria-label={label}
    >
      <div className={styles.axis} aria-hidden="true">
        {[100, 75, 50, 25, 0].map((tick) => (
          <span key={tick} style={{ top: `${100 - tick}%` }}>{tick}%</span>
        ))}
      </div>

      <svg className={styles.tankSvg} viewBox="0 0 280 360" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${ids}-back-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#07141a" stopOpacity=".82" />
            <stop offset=".16" stopColor="#17303a" stopOpacity=".2" />
            <stop offset=".52" stopColor="#071117" stopOpacity=".38" />
            <stop offset=".84" stopColor="#102730" stopOpacity=".17" />
            <stop offset="1" stopColor="#030a0e" stopOpacity=".86" />
          </linearGradient>
          <linearGradient id={`${ids}-front-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d9f7fb" stopOpacity=".15" />
            <stop offset=".08" stopColor="#79b7c3" stopOpacity=".035" />
            <stop offset=".32" stopColor="#fff" stopOpacity=".018" />
            <stop offset=".68" stopColor="#fff" stopOpacity=".01" />
            <stop offset=".91" stopColor="#7fb7c2" stopOpacity=".04" />
            <stop offset="1" stopColor="#e9fcff" stopOpacity=".17" />
          </linearGradient>
          <linearGradient id={`${ids}-glass-edge`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e8fbff" stopOpacity=".5" />
            <stop offset=".1" stopColor="#8cc7d1" stopOpacity=".12" />
            <stop offset=".34" stopColor="#fff" stopOpacity=".018" />
            <stop offset=".72" stopColor="#fff" stopOpacity=".012" />
            <stop offset=".92" stopColor="#80bac5" stopOpacity=".13" />
            <stop offset="1" stopColor="#effdff" stopOpacity=".48" />
          </linearGradient>
          <linearGradient id={`${ids}-liquid-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--margin-liquid-start)" stopOpacity=".62" />
            <stop offset=".13" stopColor="var(--margin-liquid-end)" stopOpacity=".74" />
            <stop offset=".58" stopColor="var(--margin-liquid-end)" stopOpacity=".82" />
            <stop offset="1" stopColor="var(--margin-liquid-end)" stopOpacity=".93" />
          </linearGradient>
          <radialGradient id={`${ids}-liquid-volume`} cx="50%" cy="38%" r="72%">
            <stop offset="0" stopColor="#001314" stopOpacity=".48" />
            <stop offset=".5" stopColor="var(--margin-liquid-end)" stopOpacity=".12" />
            <stop offset=".84" stopColor="var(--margin-liquid-start)" stopOpacity=".15" />
            <stop offset="1" stopColor="#00090b" stopOpacity=".34" />
          </radialGradient>
          <linearGradient id={`${ids}-liquid-absorption`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#001014" stopOpacity=".5" />
            <stop offset=".14" stopColor="var(--margin-liquid-start)" stopOpacity=".12" />
            <stop offset=".34" stopColor="#001215" stopOpacity=".25" />
            <stop offset=".62" stopColor="#000b0d" stopOpacity=".38" />
            <stop offset=".86" stopColor="var(--margin-liquid-start)" stopOpacity=".1" />
            <stop offset="1" stopColor="#000709" stopOpacity=".58" />
          </linearGradient>
          <radialGradient id={`${ids}-surface-plane`} cx="38%" cy="28%" r="78%">
            <stop offset="0" stopColor="#fff" stopOpacity=".24" />
            <stop offset=".24" stopColor="var(--margin-liquid-start)" stopOpacity=".54" />
            <stop offset=".7" stopColor="var(--margin-liquid-end)" stopOpacity=".42" />
            <stop offset="1" stopColor="#001012" stopOpacity=".5" />
          </radialGradient>
          <linearGradient id={`${ids}-surface-highlight`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".02" />
            <stop offset=".32" stopColor="#fff" stopOpacity=".5" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".13" />
            <stop offset=".78" stopColor="#fff" stopOpacity=".3" />
            <stop offset="1" stopColor="#fff" stopOpacity=".015" />
          </linearGradient>
          <linearGradient id={`${ids}-reflection`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".42" stopColor="#dffbff" stopOpacity=".13" />
            <stop offset=".55" stopColor="#fff" stopOpacity=".025" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${ids}-base-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#26343b" stopOpacity=".78" />
            <stop offset=".26" stopColor="#080f13" stopOpacity=".98" />
            <stop offset=".7" stopColor="#020609" stopOpacity="1" />
            <stop offset="1" stopColor="#172329" stopOpacity=".82" />
          </linearGradient>
          <filter id={`${ids}-surface-organic`} x="-10%" y="-80%" width="120%" height="260%">
            <feTurbulence type="fractalNoise" baseFrequency=".01 .055" numOctaves="2" seed="23" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.45" xChannelSelector="R" yChannelSelector="B" />
          </filter>
          <filter id={`${ids}-contact-shadow`} x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id={`${ids}-vessel`}>
            <path d="M45 42 C45 29 87 20 140 20 C193 20 235 29 235 42 L235 302 C235 318 193 329 140 329 C87 329 45 318 45 302 Z" />
          </clipPath>
          <clipPath id={`${ids}-liquid-mass`}>
            <path ref={liquidClipRef} d={LIQUID_MASS_PATH} />
          </clipPath>
          <clipPath id={`${ids}-surface-plane-clip`}>
            <ellipse cx="140" cy={SURFACE_Y} rx="89" ry="12" />
          </clipPath>
        </defs>

        <g data-layer="contact-shadow">
          <ellipse className={styles.contactShadow} cx="140" cy="339" rx="105" ry="12" fill="#000" fillOpacity=".72" filter={`url(#${ids}-contact-shadow)`} />
          <ellipse cx="140" cy="330" rx="103" ry="17" fill={`url(#${ids}-base-metal)`} stroke="#9fc3ca" strokeOpacity=".11" strokeWidth="1" />
        </g>

        <g data-layer="back-glass" clipPath={`url(#${ids}-vessel)`}>
          <path d="M45 42 C45 29 87 20 140 20 C193 20 235 29 235 42 L235 302 C235 318 193 329 140 329 C87 329 45 318 45 302 Z" fill={`url(#${ids}-back-glass)`} />
          <ellipse cx="140" cy="43" rx="92" ry="20" fill="#02070a" fillOpacity=".72" />
          <path d="M48 42 C52 29 91 22 140 22 C189 22 228 29 232 42" fill="none" stroke="#b6d5db" strokeOpacity=".085" strokeWidth="2" />
        </g>

        <g data-layer="liquid" clipPath={`url(#${ids}-vessel)`}>
          <g
            className={styles.liquidLevel}
            style={{ transform: `translate3d(0, ${liquidTop}px, 0)`, opacity: animatedLevel > 0 ? 1 : 0 }}
          >
            <g className={styles.liquidMass}>
              <path ref={liquidBodyRef} data-surface-path="body" d={LIQUID_MASS_PATH} fill={`url(#${ids}-liquid-body)`} />
              <g clipPath={`url(#${ids}-liquid-mass)`}>
                <rect x="38" y="8" width="204" height="356" fill={`url(#${ids}-liquid-volume)`} />
                <rect x="40" y="8" width="200" height="356" fill={`url(#${ids}-liquid-absorption)`} />
                <g className={styles.internalReflection} fill="none" stroke="#e6fdff" strokeLinecap="round">
                  <path d="M69 44 C86 78 74 134 91 184 C101 214 92 260 104 306" strokeOpacity=".085" strokeWidth="5" />
                  <path d="M191 50 C180 96 191 146 178 194 C170 226 179 272 168 315" strokeOpacity=".045" strokeWidth="3" />
                </g>
                <g className={styles.particulate} fill="#efffff">
                  <circle cx="82" cy="116" r="1" opacity=".1" />
                  <circle cx="119" cy="178" r=".7" opacity=".07" />
                  <circle cx="177" cy="92" r=".8" opacity=".08" />
                  <circle cx="205" cy="224" r="1.1" opacity=".055" />
                  <circle cx="147" cy="268" r=".65" opacity=".07" />
                </g>
              </g>
            </g>

            <g data-layer="liquid-surface">
              <g className={styles.surfaceAssembly}>
                <ellipse className={styles.surfacePlane} cx="140" cy={SURFACE_Y} rx="89" ry="11" fill={`url(#${ids}-surface-plane)`} />
                <g clipPath={`url(#${ids}-surface-plane-clip)`} filter={`url(#${ids}-surface-organic)`}>
                  <path ref={surfaceDepthRef} className={styles.surfaceDepth} d="M48 15 L232 15 L232 30 L48 30 Z" fill="#00090b" fillOpacity=".4" />
                  <path ref={surfaceFillRef} data-surface-path="fill" className={styles.surfaceUndertow} d="M48 12 L232 12 L232 29 L48 29 Z" fill="var(--margin-liquid-end)" fillOpacity=".3" />
                  <path ref={surfaceCrestRef} data-surface-path="crest" className={styles.waveFront} d="M48 12 L232 12" fill="none" stroke="var(--margin-liquid-start)" strokeOpacity=".8" strokeWidth="2.4" strokeLinecap="round" />
                </g>
                <g className={styles.meniscus} fill="none" strokeLinecap="round">
                  <path ref={meniscusLeftRef} className={styles.meniscusLeft} d="M48 12 C51 7 58 6 66 9" stroke="var(--margin-liquid-start)" strokeOpacity=".72" strokeWidth="1.5" />
                  <path ref={meniscusRightRef} className={styles.meniscusRight} d="M214 9 C222 6 229 7 232 12" stroke="var(--margin-liquid-start)" strokeOpacity=".66" strokeWidth="1.4" />
                </g>
                <path ref={surfaceHighlightRef} data-surface-path="highlight" className={styles.surfaceSheen} d="M71 11 C105 8 174 8 209 11" fill="none" stroke={`url(#${ids}-surface-highlight)`} strokeWidth="1.45" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </g>

        {targetY !== null ? (
          <g aria-label={`Meta configurada em ${targetMargin}%`}>
            <line x1="47" x2="233" y1={targetY} y2={targetY} stroke="#fff" strokeOpacity=".34" strokeDasharray="3 6" />
            <text x="238" y={targetY + 4} fill="#fff" fillOpacity=".58" fontSize="9">META</text>
          </g>
        ) : null}

        <g data-layer="front-glass">
          <path d="M45 42 L45 302 C45 318 87 329 140 329 C193 329 235 318 235 302 L235 42" fill={`url(#${ids}-front-glass)`} stroke={`url(#${ids}-glass-edge)`} strokeWidth="2.2" />
          <path d="M51 48 L51 296 C51 309 88 320 140 320 C192 320 229 309 229 296 L229 48" fill="none" stroke="#9adbea" strokeOpacity=".075" strokeWidth="1" />
          <rect x="58" y="52" width="24" height="244" rx="12" fill={`url(#${ids}-reflection)`} opacity=".52" />
          <rect x="197" y="58" width="10" height="232" rx="5" fill={`url(#${ids}-reflection)`} opacity=".18" />
          <path d="M48 62 C54 92 48 142 53 182 C57 218 50 265 56 296" fill="none" stroke="#e8fcff" strokeOpacity=".23" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M232 66 C226 106 232 152 227 196 C223 235 230 272 224 297" fill="none" stroke="#d9f8ff" strokeOpacity=".18" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        <g data-layer="top-rim">
          <path d="M45 42 C45 29 87 20 140 20 C193 20 235 29 235 42" fill="none" stroke="#c8e3e8" strokeOpacity=".22" strokeWidth="2.4" />
          <path d="M235 42 C235 55 193 64 140 64 C87 64 45 55 45 42" fill="none" stroke="#7ba4ad" strokeOpacity=".1" strokeWidth="1.8" />
          <ellipse cx="140" cy="42" rx="88" ry="16" fill="#02080b" fillOpacity=".25" stroke="#e5f8fb" strokeOpacity=".12" strokeWidth="1" />
          <path d="M69 32 C91 24 119 21 148 22" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M184 27 C201 30 214 34 222 39" fill="none" stroke="#b8dae0" strokeOpacity=".1" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        <g data-layer="base">
          <ellipse cx="140" cy="304" rx="94" ry="23" fill="none" stroke="#9fc4ca" strokeOpacity=".08" strokeWidth="1" />
          <path d="M42 318 C55 333 94 339 140 339 C186 339 225 333 238 318 L238 327 C220 342 183 348 140 348 C97 348 60 342 42 327 Z" fill={`url(#${ids}-base-metal)`} stroke="#abcbd0" strokeOpacity=".11" strokeWidth="1" />
          <ellipse cx="140" cy="327" rx="98" ry="17" fill="none" stroke="#d5eef2" strokeOpacity=".12" strokeWidth="1" />
          <path d="M76 337 C108 344 166 345 203 335" fill="none" stroke="var(--margin-accent)" strokeOpacity=".075" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
    </figure>
  );
}
