"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { supabase } from "../lib/supabase/client";

type UserSkillRow = {
  user_id: string;
  skill_id: string;
};

type GuestPersistedState = {
  onboardingSelections: string[];
  completedSkillIds: string[];
};

type SkillStore = GuestPersistedState & {
  // 2.1 Viewport Lock: drawer open state freezes the React Flow canvas.
  isDrawerOpen: boolean;
  selectedSkillId: string | null;
  openDrawer: (skillId: string) => void;
  closeDrawer: () => void;
  setDrawerOpen: (isDrawerOpen: boolean) => void;

  // 2.1 Optimistic Updates: instant completion + rollback-on-failure toast.
  toastError: string | null;
  dismissToast: () => void;
  isSkillCompleted: (skillId: string) => boolean;
  completeSkillOptimistic: (skillId: string, userId: string | null) => Promise<void>;

  // 2.2 Guest Data & Social Login Migration Pipeline.
  setOnboardingSelections: (selections: string[]) => void;
  isMigrating: boolean;
  migrateGuestDataToSupabase: (userId: string) => Promise<{ migratedCount: number }>;
};

// localStorage doesn't exist while this module is evaluated during SSR;
// fall back to a no-op storage so `persist` doesn't throw on the server.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useSkillStore = create<SkillStore>()(
  persist(
    (set, get) => ({
      isDrawerOpen: false,
      selectedSkillId: null,
      openDrawer: (skillId) =>
        set({
          isDrawerOpen: true,
          selectedSkillId: skillId,
        }),
      closeDrawer: () =>
        set({
          isDrawerOpen: false,
          selectedSkillId: null,
        }),
      setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

      onboardingSelections: [],
      completedSkillIds: [],
      setOnboardingSelections: (selections) => set({ onboardingSelections: selections }),

      toastError: null,
      dismissToast: () => set({ toastError: null }),
      isSkillCompleted: (skillId) => get().completedSkillIds.includes(skillId),

      completeSkillOptimistic: async (skillId, userId) => {
        if (get().completedSkillIds.includes(skillId)) {
          return;
        }

        set((state) => ({
          completedSkillIds: [...state.completedSkillIds, skillId],
          toastError: null,
        }));

        if (!userId) {
          // Guest mode: `persist` middleware already wrote this to LocalStorage.
          return;
        }

        const payload: UserSkillRow = { user_id: userId, skill_id: skillId };
        const { error } = await supabase
          .from("user_skills")
          .upsert(payload, { onConflict: "user_id,skill_id", ignoreDuplicates: true });

        if (error) {
          set((state) => ({
            completedSkillIds: state.completedSkillIds.filter((id) => id !== skillId),
            toastError: "스킬 완료 저장에 실패했습니다. 다시 시도해주세요.",
          }));
        }
      },

      isMigrating: false,
      migrateGuestDataToSupabase: async (userId) => {
        const { completedSkillIds } = get();
        if (completedSkillIds.length === 0) {
          return { migratedCount: 0 };
        }

        set({ isMigrating: true });

        const rows: UserSkillRow[] = completedSkillIds.map((skillId) => ({
          user_id: userId,
          skill_id: skillId,
        }));

        const { error } = await supabase
          .from("user_skills")
          .upsert(rows, { onConflict: "user_id,skill_id", ignoreDuplicates: true });

        if (error) {
          set({
            isMigrating: false,
            toastError: "게스트 데이터 병합에 실패했습니다.",
          });
          return { migratedCount: 0 };
        }

        set({
          completedSkillIds: [],
          onboardingSelections: [],
          isMigrating: false,
        });
        useSkillStore.persist.clearStorage();

        return { migratedCount: rows.length };
      },
    }),
    {
      name: "zarami-guest-store",
      storage: createJSONStorage<GuestPersistedState>(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        onboardingSelections: state.onboardingSelections,
        completedSkillIds: state.completedSkillIds,
      }),
    },
  ),
);
