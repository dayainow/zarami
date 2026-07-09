"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

export type UserTree = {
  id?: string;
  title?: string;
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
};

const USER_TREE_QUERY_KEY = ["userTree"] as const;

async function fetchUserTrees(userId: string): Promise<{ id: string; title: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_trees")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchUserTree(treeId: string): Promise<UserTree | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_trees")
    .select("id, title, nodes, edges")
    .eq("id", treeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    nodes: (data.nodes ?? []) as SkillTreeNode[],
    edges: (data.edges ?? []) as SkillTreeEdge[],
  };
}

export function useUserTrees(userId: string | null) {
  return useQuery({
    queryKey: [...USER_TREE_QUERY_KEY, "list", userId],
    queryFn: () => fetchUserTrees(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUserTree(treeId: string | null) {
  return useQuery({
    queryKey: [...USER_TREE_QUERY_KEY, "detail", treeId],
    queryFn: () => fetchUserTree(treeId as string),
    enabled: Boolean(treeId),
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
      let result;
      
      if (tree.id) {
        // Update existing tree
        result = await supabase.from("user_trees").update({
          title: tree.title,
          nodes: tree.nodes,
          edges: tree.edges,
          updated_at: new Date().toISOString(),
        }).eq("id", tree.id);
      } else {
        // Create new tree
        result = await supabase.from("user_trees").insert({
          user_id: userId,
          title: tree.title || "새 로드맵",
          nodes: tree.nodes,
          edges: tree.edges,
          updated_at: new Date().toISOString(),
        }).select("id").single();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USER_TREE_QUERY_KEY] });
    },
  });
}
