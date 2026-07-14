import { Metadata } from "next";

import { TrendsClient } from "@/components/trends/TrendsClient";

export const metadata: Metadata = {
  title: "채용 트렌드 - Zarami",
  description: "개발 직군 채용 공고 통계 및 스킬 트렌드 분석",
};

import { Suspense } from "react";

export default function TrendsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading trends...</div>}>
      <TrendsClient />
    </Suspense>
  );
}
