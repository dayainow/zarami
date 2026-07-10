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
  currentStreak: number;
  maxStreak: number;
  totalEstimatedMinutes: number;
  categoryStats: Record<string, { total: number; completed: number }>;
  recentAchievements: { id: string; title: string; category?: string; completedAt: string }[];
  completedSkills: string[];
  allSkillTitles: string[];
  practicalScore: number;
  githubCertifiedCount: number;
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
  let totalEstimatedMinutes = 0;
  const categoryStats: Record<string, { total: number; completed: number }> = {};
  
  for (const node of allNodes) {
    const cat = node.data.category || "General";
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
    categoryStats[cat].total++;
  }

  const validCompletedNodes = [];
  let practicalScore = 0;
  let githubCertifiedCount = 0;

  for (const node of completedNodes) {
    const cat = node.data.category || "General";
    categoryStats[cat].completed++;
    totalEstimatedMinutes += node.data.estimatedMinutes || 0;

    practicalScore += 10;
    if (node.data.questMarkdown) {
      practicalScore += 20;
    }
    
    if (node.data.certified_by_github) {
      githubCertifiedCount++;
    }

    const completedAt = node.data.completedAt;
    if (!completedAt) {
      continue;
    }
    validCompletedNodes.push(node);
    const date = completedAt.slice(0, 10);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  validCompletedNodes.sort((a, b) => new Date(b.data.completedAt!).getTime() - new Date(a.data.completedAt!).getTime());
  
  const recentAchievements = validCompletedNodes.slice(0, 5).map(n => ({
    id: n.id,
    title: n.data.title,
    category: n.data.category || "General",
    completedAt: n.data.completedAt!
  }));
  
  const completedSkills = validCompletedNodes.map(n => n.data.title);
  const allSkillTitles = allNodes.map(n => n.data.title);

  // Streaks calculation
  let currentStreak = 0;
  let maxStreak = 0;
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  const uniqueDates = Array.from(countByDate.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (uniqueDates.length > 0) {
    const firstDate = new Date(uniqueDates[0]);
    firstDate.setHours(0,0,0,0);
    const diffDays = Math.floor((todayDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays <= 1) {
      currentStreak = 1;
      const checkDate = new Date(firstDate);
      for (let i = 1; i < uniqueDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (uniqueDates[i] === checkDate.toISOString().slice(0, 10)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    let currMax = 1;
    let tempStreak = 1;
    let prevDate = new Date(uniqueDates[0]);
    for (let i = 1; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      const diff = Math.floor((prevDate.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > currMax) currMax = tempStreak;
      prevDate = d;
    }
    maxStreak = currMax;
  }

  const heatmap = buildEmptyHeatmap().map((day) => ({
    date: day.date,
    count: countByDate.get(day.date) ?? 0,
  }));

  return { 
    heatmap, 
    totalCount: allNodes.length, 
    completedCount: completedNodes.length,
    currentStreak,
    maxStreak,
    totalEstimatedMinutes,
    categoryStats,
    recentAchievements,
    completedSkills,
    allSkillTitles,
    practicalScore,
    githubCertifiedCount,
  };
}

export function useProfileStats(userId: string | null) {
  return useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => fetchProfileStats(userId as string),
    enabled: Boolean(userId),
  });
}
