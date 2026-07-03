import { Suspense } from "react";

import { DashboardClient } from "@/components/dashboard/DashboardClient";

function DashboardFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
        대시보드를 불러오는 중
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}
