"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useProfileStats } from "@/hooks/useProfileStats";
import { createClient } from "@/utils/supabase/client";
import { WorldMapOverlay } from "./WorldMapOverlay";

export function WorldMapClient() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const userId = sessionUser?.id ?? null;
  const { data: stats } = useProfileStats(userId);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const totalCount = stats?.totalCount ?? 0;
  const completedCount = stats?.completedCount ?? 0;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <main className="flex h-screen min-h-screen flex-col bg-slate-900 transition-colors duration-300">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar over the map */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between p-6">
          <div>
            <h1 className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">스킬 모험 지도</h1>
            <p className="mt-1 text-sm font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {completedCount}/{totalCount} 스킬 완료 · {progressPercent}% 달성
            </p>
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              onClick={() => setMapZoom((z) => Math.min(z + 0.5, 3))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/50 bg-white/80 font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-white dark:hover:bg-black/80"
              aria-label="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setMapZoom((z) => Math.max(z - 0.5, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/50 bg-white/80 font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-white dark:hover:bg-black/80"
              aria-label="Zoom Out"
            >
              -
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div 
          className="relative w-full flex-1 overflow-auto bg-slate-900"
          style={{ touchAction: mapZoom > 1 ? "pan-x pan-y" : "none" }}
        >
          <div 
            className="relative min-h-full min-w-full origin-top-left transition-all duration-300"
            style={{ width: `${mapZoom * 100}%`, height: `${mapZoom * 100}%` }}
          >
            <Image src="/images/world_map.png" alt="World Map" fill className="object-contain object-center" style={{ imageRendering: "pixelated" }} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60" />
            <div 
              className="pointer-events-none absolute inset-0 z-10 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage: "linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
                backgroundSize: "100% 4px, 3px 100%",
              }}
            />
            <WorldMapOverlay categoryStats={stats?.categoryStats ?? {}} />
          </div>
        </div>

        {/* Progress Bar at Bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 pb-8 pl-6 pr-6 pt-16 sm:pb-12">
          <div className="mx-auto w-full max-w-4xl">
            <div className="h-4 w-full overflow-hidden rounded-full border border-white/20 bg-black/60 shadow-inner backdrop-blur-md">
              <div
                className="h-full rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
