import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, Check, CircleHelp, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateLabel } from "./types";

export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-white/[.065]", className)} />;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/45">{eyebrow}</p> : null}
        <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-white sm:text-2xl">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-5 text-white/52">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricHint({ label, children }: { label: string; children: ReactNode }) {
  const hintId = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={label} aria-describedby={hintId} className="grid h-7 w-7 place-items-center text-white/36 transition hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/45">
        <CircleHelp size={14} />
      </button>
      <span id={hintId} role="tooltip" className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] translate-y-1 bg-[#101825] px-3 py-2.5 text-left text-[11px] font-normal leading-5 text-white/72 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,.48)] ring-1 ring-inset ring-white/10 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {children}
      </span>
    </span>
  );
}

export function InlineNotice({ text, error, onRetry }: { text: string; error?: boolean; onRetry?: () => void }) {
  return (
    <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} className={cn("flex items-center justify-between gap-4 border-l-2 px-4 py-3 text-[12px]", error ? "border-rose-300 bg-rose-400/[.055] text-rose-100" : "border-purple bg-purple/[.045] text-purple-100") }>
      <span className="flex items-center gap-2"><AlertTriangle size={14} />{text}</span>
      {onRetry ? <button type="button" onClick={onRetry} className="shrink-0 font-semibold text-white underline decoration-white/25 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/45">Tentar novamente</button> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid min-h-32 place-items-center border-y border-dashed border-white/[.07] px-6 py-8 text-center">
      <div>
        <span className="mx-auto grid h-8 w-8 place-items-center border border-white/[.08] text-white/35"><Clock3 size={14} /></span>
        <p className="mt-3 text-sm font-semibold text-white/72">{title}</p>
        {description ? <p className="mt-1 max-w-lg text-[12px] leading-5 text-white/45">{description}</p> : null}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#02050a]/78 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-hidden="true" tabIndex={-1} />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitleId} tabIndex={-1} className="relative flex h-full w-full max-w-[560px] flex-col border-l border-white/[.09] bg-[linear-gradient(155deg,#0b111b,#05080e_72%)] shadow-[-34px_0_100px_rgba(0,0,0,.5)]">
        <header className="flex items-start justify-between border-b border-white/[.07] px-6 py-6">
          <div><h2 id={titleId} className="text-xl font-semibold tracking-[-.035em] text-white">{title}</h2><p id={subtitleId} className="mt-1.5 text-[12px] leading-5 text-white/48">{subtitle}</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Fechar ${title}`} className="grid h-11 w-11 shrink-0 place-items-center border border-white/[.09] text-white/48 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50"><X size={16} /></button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function TimelineStep({ label, date, complete, pending }: { label: string; date?: string; complete: boolean; pending?: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span className={cn("grid h-8 w-8 place-items-center border", complete ? "border-money/30 bg-money/[.08] text-money" : "border-white/[.1] text-white/35")}>{complete ? <Check size={14} /> : <Clock3 size={14} />}</span>
        <span className="h-10 w-px bg-white/[.08]" />
      </div>
      <div className="pt-0.5"><p className="text-[12px] font-semibold text-white/78">{label}</p><p className="mt-1 text-[11px] text-white/42">{date ? dateLabel(date) : pending || "—"}</p></div>
    </div>
  );
}
