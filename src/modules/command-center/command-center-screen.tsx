"use client";

import { Navigation } from "@/shell/navigation";
import { Topbar } from "@/shell/topbar";
import { AiCopilot } from "@/shell/ai-copilot";
import { OperationalEnvironment } from "@/components/environment/operational-environment";
import { CommandHero } from "./components/command-hero";
import { MissionPriorityStrip } from "./components/mission-priority-strip";
import { LiveCallsPanel } from "./components/live-calls-panel";
import { MoneyAlertPanel } from "./components/money-alert-panel";
import { FollowUpPanel } from "./components/follow-up-panel";
import { SalesArenaPanel } from "./components/sales-arena-panel";
import { PipelinePanel } from "./components/pipeline-panel";
import { PerformancePanel } from "./components/performance-panel";
import { QuickDock } from "./components/quick-dock";

export function CommandCenterScreen() {
  return (
    <main className="kau-shell noise relative flex h-screen overflow-hidden text-white">
      <OperationalEnvironment />
      <Navigation />
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-24">
          <CommandHero />
          <MissionPriorityStrip />
          <div className="mt-4 grid grid-cols-12 gap-4">
            <LiveCallsPanel />
            <MoneyAlertPanel />
            <FollowUpPanel />
            <SalesArenaPanel />
            <PipelinePanel />
            <PerformancePanel />
          </div>
        </div>
        <QuickDock />
      </section>
      <AiCopilot />
    </main>
  );
}
