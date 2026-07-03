"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";

export type HeatmapDay = {
  date: string;
  count: number;
};

export type ProfileStats = {
  heatmap: HeatmapDay[];
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

async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_skills")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("is_completed", true);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as { updated_at: string | null }[];
  const countByDate = new Map<string, number>();
  for (const row of rows) {
    if (!row.updated_at) {
      continue;
    }
    const date = row.updated_at.slice(0, 10);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  const heatmap = buildEmptyHeatmap().map((day) => ({
    date: day.date,
    count: countByDate.get(day.date) ?? 0,
  }));

  return { heatmap };
}

export function useProfileStats(userId: string | null) {
  return useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => fetchProfileStats(userId as string),
    enabled: Boolean(userId),
  });
}
