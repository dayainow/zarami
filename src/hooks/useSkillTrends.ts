"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import type { SamplePosting } from "@/types/skill-tree";

export type SkillTrend = {
  id: string;
  title: string;
  trend_score: string | null;
  wanted_mentions: number | null;
  jumpit_mentions: number | null;
  total_postings_analyzed: number | null;
  trend_updated_at: string | null;
  sample_postings: SamplePosting[] | null;
  segment_stats: Record<string, Record<string, number>> | null;
};

async function fetchSkillTrends(): Promise<SkillTrend[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("skills")
    .select(
      "id, title, trend_score, wanted_mentions, jumpit_mentions, total_postings_analyzed, trend_updated_at, sample_postings, segment_stats",
    );

  if (error) {
    console.error("Failed to fetch skill trends:", error.message);
    return [{
      id: "error",
      title: "Error: " + error.message,
      trend_score: "High",
      wanted_mentions: 1,
      jumpit_mentions: 1,
      total_postings_analyzed: 1,
      trend_updated_at: new Date().toISOString(),
      sample_postings: [],
      segment_stats: null
    }];
  }

  return (data ?? []) as SkillTrend[];
}

export function useSkillTrends() {
  return useQuery({
    queryKey: ["skillTrends"],
    queryFn: fetchSkillTrends,
    staleTime: 5 * 60 * 1000,
  });
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[\s\-_./()·]/g, "");
}

// Personal trees (AI-generated or hand-authored) use freely-chosen ids and
// titles, not the fixed skills-catalog ids scripts/update-trend.ts writes
// to - so evidence has to be matched by title text rather than id. This is
// necessarily imprecise (loose substring match) and returns undefined
// rather than guessing when nothing lines up.
export function findSkillTrend(nodeTitle: string, trends: SkillTrend[]): SkillTrend | undefined {
  const normalizedNodeTitle = normalizeTitle(nodeTitle);
  if (!normalizedNodeTitle) {
    return undefined;
  }

  return trends.find((trend) => {
    const normalizedCatalogTitle = normalizeTitle(trend.title);
    return (
      normalizedCatalogTitle.length > 0 &&
      (normalizedNodeTitle.includes(normalizedCatalogTitle) || normalizedCatalogTitle.includes(normalizedNodeTitle))
    );
  });
}
