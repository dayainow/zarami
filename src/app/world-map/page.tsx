import { Metadata } from "next";

import { WorldMapClient } from "@/components/world-map/WorldMapClient";

export const metadata: Metadata = {
  title: "스킬 모험 지도 - Zarami",
  description: "Zarami 스킬 모험 지도",
};

export default function WorldMapPage() {
  return <WorldMapClient />;
}
