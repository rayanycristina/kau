"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useOperationStore } from "@/store/operation-store";
import type { SalesSummary } from "@/data/sales-types";

export function SalesBoot() {
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();
  const hydrateSalesSummary = useOperationStore((s) => s.hydrateSalesSummary);

  useEffect(() => {
    if (isLoading || !profile || pathname === "/sales") return;

    let ignore = false;

    async function loadSummary() {
      try {
        const response = await fetch("/api/sales/summary", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const summary = (await response.json()) as SalesSummary;
        if (!ignore) hydrateSalesSummary(summary);
      } catch {
        // Offline/local prototype mode: keep visual mock data alive.
      }
    }

    loadSummary();
    const interval = window.setInterval(loadSummary, 45000);
    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [hydrateSalesSummary, isLoading, pathname, profile]);

  return null;
}
