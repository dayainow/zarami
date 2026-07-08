"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

type StreakPersistedState = {
  lastActiveDate: string | null;
  currentStreak: number;
  longestStreak: number;
};

type StreakState = StreakPersistedState & {
  // Kept as its own persisted store (not folded into useSkillStore) so it
  // survives the guest -> Supabase completion migration, which wipes
  // useSkillStore's local cache once progress moves server-side. A streak
  // is about consistent daily activity in this browser, not tied to that
  // migration lifecycle.
  recordActivity: () => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      lastActiveDate: null,
      currentStreak: 0,
      longestStreak: 0,
      recordActivity: () => {
        const today = todayKey();
        const { lastActiveDate, currentStreak, longestStreak } = get();

        if (lastActiveDate === today) {
          return;
        }

        const nextStreak = lastActiveDate === yesterdayKey() ? currentStreak + 1 : 1;
        set({
          lastActiveDate: today,
          currentStreak: nextStreak,
          longestStreak: Math.max(longestStreak, nextStreak),
        });
      },
    }),
    {
      name: "zarami-streak-store",
      storage: createJSONStorage<StreakPersistedState>(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        lastActiveDate: state.lastActiveDate,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
      }),
    },
  ),
);
