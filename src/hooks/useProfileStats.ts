"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import type { SkillTreeNode } from "@/types/skill-tree";

export type HeatmapDay = {
  date: string;
  count: number;
};

export type ProfileStats = {
  heatmap: HeatmapDay[];
  totalCount: number;
  completedCount: number;
};

const HEATMAP_DAYS = 91; // 13-week trailing window, GitHub-contribution style

export function buildEmptyHeatmap(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const today = new Date();

  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    days.push({ date: date.toISOString().slice(0, 10), count: 0 });
  }

  return days;
}

// Progress and the contribution heatmap are aggregated across every one of
// the user's personal trees (not a single fixed catalog - that stopped
// existing once the dashboard became "your own trees"). completedAt is only
// set going forward (see useToggleNodeCompletion / ManageTreeClient's
// toggle), so nodes completed before that field existed still count toward
// totals but won't have a heatmap day - there's no way to know retroactively
// when they were finished.
async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_trees").select("nodes").eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const allNodes = (data ?? []).flatMap((row) => (row.nodes ?? []) as SkillTreeNode[]);
  const completedNodes = allNodes.filter((node) => node.data.is_completed === true);

  const countByDate = new Map<string, number>();
  for (const node of completedNodes) {
    const completedAt = node.data.completedAt;
    if (!completedAt) {
      continue;
    }
    const date = completedAt.slice(0, 10);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  const heatmap = buildEmptyHeatmap().map((day) => ({
    date: day.date,
    count: countByDate.get(day.date) ?? 0,
  }));

  return { heatmap, totalCount: allNodes.length, completedCount: completedNodes.length };
}

export function useProfileStats(userId: string | null) {
  return useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => fetchProfileStats(userId as string),
    enabled: Boolean(userId),
  });
}
