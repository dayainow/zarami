import { Metadata } from "next";

import { WorldMapClient } from "@/components/world-map/WorldMapClient";

export const metadata: Metadata = {
  title: "스킬 모험 지도 - Zarami",
  description: "Zarami 스킬 모험 지도",
};

export default async function WorldMapPage({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string }>;
}) {
  const { tree } = await searchParams;
  return <WorldMapClient initialTreeId={tree ?? null} />;
}
