"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useProfileStats } from "@/hooks/useProfileStats";
import { useUserTrees } from "@/hooks/useUserTree";
import { createClient } from "@/utils/supabase/client";
import { WorldMapOverlay } from "./WorldMapOverlay";
import { Folder, Map } from "lucide-react";

export function WorldMapClient() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const userId = sessionUser?.id ?? null;
  const { data: stats } = useProfileStats(userId);
  const { data: userTrees } = useUserTrees(userId);
  const [selectedTreeId, setSelectedTreeId] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const activeTree = userTrees?.find(t => t.id === selectedTreeId);
  const displayTotalCount = activeTree ? activeTree.nodes.filter(n => !n.id.includes('-')).length : (stats?.totalCount ?? 0);
  const displayCompletedCount = activeTree ? activeTree.nodes.filter(n => !n.id.includes('-') && n.data.is_completed).length : (stats?.completedCount ?? 0);
  const progressPercent = displayTotalCount === 0 ? 0 : Math.round((displayCompletedCount / displayTotalCount) * 100);

  return (
    <main className="flex h-screen min-h-screen flex-col bg-[#73C856] transition-colors duration-300">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar over the map */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between p-6">
          <div className="pointer-events-auto flex flex-col gap-2">
            <h1 className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">나만의 스킬 월드</h1>
            <p className="mt-1 text-sm font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {activeTree ? activeTree.title : "전체 맵 한눈에 보기"} · {displayCompletedCount}/{displayTotalCount} 완료 ({progressPercent}%)
            </p>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mt-2 flex w-max items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-800 shadow-lg backdrop-blur hover:bg-white"
            >
              <Folder className="h-4 w-4" />
              월드 폴더 열기
            </button>
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
          className="relative w-full flex-1 overflow-auto bg-[#73C856]"
          style={{ touchAction: mapZoom > 1 ? "pan-x pan-y" : "none" }}
        >
          <div 
            className="relative min-h-full min-w-full origin-top-left transition-all duration-300"
            style={{ width: `${mapZoom * 100}%`, height: `${mapZoom * 100}%` }}
          >
            <Image src="/images/world_map.png" alt="World Map" fill className="object-cover object-center" style={{ imageRendering: "pixelated" }} />
            
            <WorldMapOverlay 
              categoryStats={stats?.categoryStats ?? {}} 
              activeTree={activeTree}
            />
          </div>
        </div>

        {/* Progress Bar at Bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 pb-8 pl-6 pr-6 pt-16 sm:pb-12 bg-gradient-to-t from-black/40 to-transparent">
          <div className="mx-auto w-full max-w-4xl">
            <div className="h-4 w-full overflow-hidden rounded-full border border-white/40 bg-black/60 shadow-inner backdrop-blur-md">
              <div
                className="h-full rounded-full bg-[#FFE128] shadow-[0_0_12px_rgba(255,225,40,0.8)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Folder UI */}
        {isSidebarOpen && (
          <div className="absolute left-6 top-32 z-30 w-64 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl transition-all">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-black text-slate-800">내 로드맵 폴더</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <button
                onClick={() => { setSelectedTreeId("all"); setIsSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold transition-all ${selectedTreeId === "all" ? "bg-indigo-500 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Map className="h-4 w-4" />
                전체 맵 한눈에 보기
              </button>
              {userTrees?.map((tree) => (
                <button
                  key={tree.id}
                  onClick={() => { setSelectedTreeId(tree.id); setIsSidebarOpen(false); }}
                  className={`mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold transition-all ${selectedTreeId === tree.id ? "bg-emerald-500 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <Folder className="h-4 w-4" />
                  {tree.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
