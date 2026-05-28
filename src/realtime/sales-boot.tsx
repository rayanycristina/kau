"use client";

import { useEffect } from "react";
import { useOperationStore } from "@/store/operation-store";
import type { SalesSummary } from "@/data/sales-types";

export function SalesBoot() {
  const hydrateSalesSummary = useOperationStore((s) => s.hydrateSalesSummary);

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      try {
        const response = await fetch("/api/sales/summary", { cache: "no-store" });
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
  }, [hydrateSalesSummary]);

  return null;
}
