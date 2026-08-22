"use client";

import { Navigation } from "@/shell/navigation";
import { Topbar } from "@/shell/topbar";
import { OperationalEnvironment } from "@/components/environment/operational-environment";
import { RealNetMargin } from "./components/real-net-margin";

export function CommandCenterScreen() {
  return (
    <main className="kau-shell noise relative flex h-screen overflow-hidden text-white">
      <OperationalEnvironment />
      <div className="hidden lg:contents">
        <Navigation />
      </div>
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="hidden lg:block">
          <Topbar
            title="Command Center"
            subtitle="Visão executiva da saúde financeira da sua operação."
          />
        </div>
        <header className="px-4 pb-4 pt-5 lg:hidden">
          <h1 className="text-xl font-black uppercase tracking-tight">Command Center</h1>
          <p className="mt-1 max-w-sm text-sm leading-5 text-white/58">
            Visão executiva da saúde financeira da sua operação.
          </p>
        </header>
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 pb-10 sm:px-5">
          <div className="mx-auto grid w-full max-w-[1760px] grid-cols-12 gap-4">
            <div className="col-span-12 min-w-0 xl:col-span-9">
              <RealNetMargin />
            </div>
            <div className="hidden xl:col-span-3 xl:block" aria-hidden="true" />
          </div>
        </div>
      </section>
    </main>
  );
}
