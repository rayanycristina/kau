"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/shell/navigation";
import { Topbar } from "@/shell/topbar";
import { OperationalEnvironment } from "@/components/environment/operational-environment";

export function WorkbenchShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="kau-shell noise relative flex h-screen overflow-hidden text-white">
      <OperationalEnvironment />
      <Navigation />
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          {children}
        </div>
      </section>
    </main>
  );
}
