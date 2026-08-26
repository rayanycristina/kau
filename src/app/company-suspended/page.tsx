"use client";

import { useState } from "react";
import { Building2, LogOut } from "lucide-react";

export default function CompanySuspendedPage() {
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#03080d] p-5 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#08121a] p-8 text-center shadow-panel">
        <Building2 className="mx-auto h-12 w-12 text-cyan" />
        <h1 className="mt-5 text-2xl font-black">Empresa indisponível</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/55">
          O acesso operacional desta empresa está suspenso. Entre em contato com a administração do KAU.
        </p>
        <button type="button" onClick={signOut} disabled={leaving} className="mx-auto mt-7 inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-bold text-white/75">
          <LogOut size={16} /> {leaving ? "Saindo..." : "Sair da conta"}
        </button>
      </section>
    </main>
  );
}
