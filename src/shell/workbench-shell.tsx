"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/shell/navigation";
import { Topbar } from "@/shell/topbar";
import { OperationalEnvironment } from "@/components/environment/operational-environment";

export function WorkbenchShell({ title, subtitle, children, hideTopbar = false }: { title: string; subtitle: string; children: ReactNode; hideTopbar?: boolean }) {
  return (
    <main className="kau-shell noise relative flex h-screen overflow-hidden text-white">
      <OperationalEnvironment />
      <Navigation />
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        {hideTopbar ? null : <Topbar title={title} subtitle={subtitle} />}
        <div className={hideTopbar ? "scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5" : "scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-8"}>
          {children}
        </div>
      </section>
    </main>
  );
}
