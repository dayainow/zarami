"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

export type UserTree = {
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
};

const USER_TREE_QUERY_KEY = ["userTree"] as const;

async function fetchUserTree(userId: string): Promise<UserTree | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_trees")
    .select("nodes, edges")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    nodes: (data.nodes ?? []) as SkillTreeNode[],
    edges: (data.edges ?? []) as SkillTreeEdge[],
  };
}

export function useUserTree(userId: string | null) {
  return useQuery({
    queryKey: [...USER_TREE_QUERY_KEY, userId],
    queryFn: () => fetchUserTree(userId as string),
    enabled: Boolean(userId),
  });
}

export function useSaveUserTree(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tree: UserTree) => {
      if (!userId) {
        throw new Error("로그인이 필요합니다.");
      }

      const supabase = createClient();
      const { error } = await supabase.from("user_trees").upsert(
        {
          user_id: userId,
          nodes: tree.nodes,
          edges: tree.edges,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USER_TREE_QUERY_KEY, userId] });
    },
  });
}
