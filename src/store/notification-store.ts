"use client";

import { create } from "zustand";

export type NotificationTone = "money" | "cyan" | "danger" | "amber" | "purple";

export type KauNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  tone?: NotificationTone;
};

type NotificationState = {
  notifications: KauNotification[];
  addNotification: (input: Omit<KauNotification, "id" | "createdAt">) => KauNotification;
  clearNotifications: () => void;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (input) => {
    const item = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...input
    };

    set((state) => ({
      notifications: [item, ...state.notifications].slice(0, 30)
    }));

    return item;
  },
  clearNotifications: () => set({ notifications: [] })
}));
