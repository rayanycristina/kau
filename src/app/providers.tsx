"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { RealtimeBoot } from "@/realtime/realtime-boot";
import { SalesBoot } from "@/realtime/sales-boot";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RealtimeBoot />
        <SalesBoot />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
