"use client";

import { useMutation } from "@tanstack/react-query";

import { useSkillStore } from "@/stores/useSkillStore";
import { createClient } from "@/utils/supabase/client";

export const COMPLETE_SKILL_MUTATION_KEY = ["completeSkill"] as const;

type CompleteSkillVariables = {
  skillId: string;
  userId: string | null;
};

type CompleteSkillContext = {
  previousCompletedSkillIds: string[] | null;
};

// The "물주기" (watering) transaction. `onMutate` flips the store's
// `completedSkillIds` instantly for 60fps-feeling UI; the network upsert is
// owned by `mutationFn`. With the default `networkMode: "online"`, going
// offline mid-click doesn't error the mutation - TanStack pauses it in the
// in-memory mutationCache and auto-resumes/flushes it once `onlineManager`
// reports the browser is back online.
export function useCompleteSkillMutation() {
  const applySkillCompletion = useSkillStore((state) => state.applySkillCompletion);
  const rollbackSkillCompletion = useSkillStore((state) => state.rollbackSkillCompletion);

  return useMutation<void, Error, CompleteSkillVariables, CompleteSkillContext>({
    mutationKey: COMPLETE_SKILL_MUTATION_KEY,
    mutationFn: async ({ skillId, userId }) => {
      if (!userId) {
        // Guest mode: `persist` middleware already wrote this to LocalStorage.
        return;
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("user_skills")
        .upsert(
          { user_id: userId, skill_id: skillId },
          { onConflict: "user_id,skill_id", ignoreDuplicates: true },
        );

      if (error) {
        throw error;
      }
    },
    onMutate: ({ skillId }) => ({
      previousCompletedSkillIds: applySkillCompletion(skillId),
    }),
    onError: (_error, _variables, context) => {
      if (context?.previousCompletedSkillIds) {
        rollbackSkillCompletion(
          context.previousCompletedSkillIds,
          "스킬 완료 저장에 실패했습니다. 다시 시도해주세요.",
        );
      }
    },
  });
}
