import { Suspense } from "react";

import { DashboardClient } from "@/components/dashboard/DashboardClient";

function DashboardFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="rounded-lg border border-white/60 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
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
