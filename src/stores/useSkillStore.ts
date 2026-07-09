"use client";

import { create } from "zustand";

// Drawer open/close + toast UI state only. Node completion used to also
// live here (completedSkillIds, synced to a `user_skills` table keyed by
// the old static skill catalog), but that whole guest -> Supabase
// migration pathway went dead once ManageTreeClient started requiring
// login to create a tree at all - there was no longer any UI path that
// could produce a meaningful completedSkillIds entry. Completion truth
// now lives on each tree's own nodes (data.is_completed), see
// useToggleNodeCompletion in useUserTree.ts.
type SkillStore = {
  isDrawerOpen: boolean;
  selectedSkillId: string | null;
  openDrawer: (skillId: string) => void;
  closeDrawer: () => void;
  setDrawerOpen: (isDrawerOpen: boolean) => void;

  toastError: string | null;
  dismissToast: () => void;
};

export const useSkillStore = create<SkillStore>()((set) => ({
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

  toastError: null,
  dismissToast: () => set({ toastError: null }),
}));
