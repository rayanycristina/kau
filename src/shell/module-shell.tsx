"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/shell/navigation";
import { Topbar } from "@/shell/topbar";
import { AiCopilot } from "@/shell/ai-copilot";
import { OperationalEnvironment } from "@/components/environment/operational-environment";
import { QuickDock } from "@/modules/command-center/components/quick-dock";

export function ModuleShell({ title, subtitle, children, showAiCopilot = true, showQuickDock = true }: { title: string; subtitle: string; children: ReactNode; showAiCopilot?: boolean; showQuickDock?: boolean }) {
  return (
    <main className="kau-shell noise relative flex h-screen overflow-hidden text-white">
      <OperationalEnvironment />
      <Navigation />
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-24">
          {children}
        </div>
        {showQuickDock ? <QuickDock /> : null}
      </section>
      {showAiCopilot ? <AiCopilot /> : null}
    </main>
  );
}
