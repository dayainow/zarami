"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

type ChecklistPersistedState = {
  // Keyed by `${skillId}::${item text}` since checklist items don't have
  // their own stable id - the item text itself is the identity.
  checkedKeys: Record<string, boolean>;
};

type ChecklistState = ChecklistPersistedState & {
  toggleItem: (skillId: string, item: string) => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Exported so components can read `checkedKeys[checklistKey(...)]` directly
// via a reactive selector - a store method that reads `get()` internally
// (like a would-be `isItemChecked(id, item)`) does NOT create a Zustand
// subscription to the state it reads, so components using it silently
// never re-render on change.
export function checklistKey(skillId: string, item: string): string {
  return `${skillId}::${item}`;
}

export const useChecklistStore = create<ChecklistState>()(
  persist(
    (set, get) => ({
      checkedKeys: {},
      toggleItem: (skillId, item) => {
        const key = checklistKey(skillId, item);
        const { checkedKeys } = get();
        set({ checkedKeys: { ...checkedKeys, [key]: !checkedKeys[key] } });
      },
    }),
    {
      name: "zarami-checklist-store",
      storage: createJSONStorage<ChecklistPersistedState>(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({ checkedKeys: state.checkedKeys }),
    },
  ),
);
