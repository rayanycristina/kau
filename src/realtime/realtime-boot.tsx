"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useOperationStore } from "@/store/operation-store";
import type { RealtimeEvent } from "./events";

export function RealtimeBoot() {
  const registerRevenue = useOperationStore((s) => s.registerRevenue);
  const escalateRisk = useOperationStore((s) => s.escalateRisk);
  const heartbeat = useOperationStore((s) => s.heartbeat);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      const heartbeatTimer = window.setInterval(() => heartbeat(), 6000);
      const revenueTimer = window.setInterval(() => {
        const amount = Math.random() > 0.64 ? Math.round(220 + Math.random() * 580) : 0;
        if (amount > 0) registerRevenue(amount);
      }, 9000);
      const riskTimer = window.setInterval(() => {
        const amount = Math.random() > 0.58 ? Math.round(80 + Math.random() * 180) : 0;
        if (amount > 0) escalateRisk(amount);
      }, 11000);
      return () => {
        window.clearInterval(heartbeatTimer);
        window.clearInterval(revenueTimer);
        window.clearInterval(riskTimer);
      };
    }

    const socket = io(socketUrl, { transports: ["websocket"] });
    socket.on("kau:event", (event: RealtimeEvent) => {
      if (event.type === "revenue.closed") registerRevenue(event.payload.amount);
      if (event.type === "risk.escalated") escalateRisk(event.payload.amount);
      if (event.type === "heartbeat") heartbeat();
    });

    return () => { socket.disconnect(); };
  }, [registerRevenue, escalateRisk, heartbeat]);

  return null;
}
