"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { createClient } from "@/utils/supabase/client";

type UserSkillRow = {
  user_id: string;
  skill_id: string;
  is_completed: true;
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
  // Split into two pure, synchronous steps so a TanStack Query `useMutation`
  // can drive them from its `onMutate`/`onError` lifecycle (see
  // src/hooks/useCompleteSkillMutation.ts) while the network transaction
  // itself is queued/retried by TanStack instead of living in the store.
  toastError: string | null;
  dismissToast: () => void;
  isSkillCompleted: (skillId: string) => boolean;
  applySkillCompletion: (skillId: string) => string[] | null;
  rollbackSkillCompletion: (previousCompletedSkillIds: string[], message: string) => void;

  // 2.2 Guest Data & Social Login Migration Pipeline.
  setOnboardingSelections: (selections: string[]) => void;
  isMigrating: boolean;
  migrateGuestDataToSupabase: (userId: string) => Promise<{ migratedCount: number }>;
  resetGuestState: () => void;

  // Authoritative server -> client sync, run on every signed-in session
  // (initial load and fresh sign-in alike) so a returning user's progress
  // isn't left at whatever the local guest cache happened to contain.
  hydrateCompletedSkillIds: (skillIds: string[]) => void;
  hydrateFromSupabase: (userId: string) => Promise<void>;
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

      applySkillCompletion: (skillId) => {
        const previousCompletedSkillIds = get().completedSkillIds;
        if (previousCompletedSkillIds.includes(skillId)) {
          return null;
        }

        set({
          completedSkillIds: [...previousCompletedSkillIds, skillId],
          toastError: null,
        });

        return previousCompletedSkillIds;
      },

      rollbackSkillCompletion: (previousCompletedSkillIds, message) => {
        set({
          completedSkillIds: previousCompletedSkillIds,
          toastError: message,
        });
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
          is_completed: true,
        }));

        const supabase = createClient();
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

      resetGuestState: () => {
        set({
          completedSkillIds: [],
          onboardingSelections: [],
          selectedSkillId: null,
          isDrawerOpen: false,
          toastError: null,
        });
        useSkillStore.persist.clearStorage();
      },

      hydrateCompletedSkillIds: (skillIds) => {
        set({ completedSkillIds: skillIds });
      },

      hydrateFromSupabase: async (userId) => {
        const supabase = createClient();
        const { error, data } = await supabase
          .from("user_skills")
          .select("skill_id")
          .eq("user_id", userId)
          .eq("is_completed", true);

        if (error) {
          set({ toastError: "진행 상태를 불러오지 못했습니다." });
          return;
        }

        const skillIds = (data ?? []).map((row) => (row as { skill_id: string }).skill_id);
        get().hydrateCompletedSkillIds(skillIds);
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
