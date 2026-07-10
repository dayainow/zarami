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
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
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
            <h1 className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">스킬 지도</h1>
            <p className="mt-1 text-sm font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {activeTree ? activeTree.title : "전체 맵 한눈에 보기"} · {displayCompletedCount}/{displayTotalCount} 완료 ({progressPercent}%)
            </p>
            <p className="mt-1 text-sm font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {activeTree ? activeTree.title : "전체 맵 한눈에 보기"} · {displayCompletedCount}/{displayTotalCount} 완료 ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full flex-1 overflow-auto bg-[#73C856]">
          <div className="relative h-[800px] min-h-full min-w-[1200px] md:w-full">
            <Image 
              src="/images/world_map.png" 
              alt="World Map" 
              fill 
              className="object-cover object-center" 
              style={{ imageRendering: "pixelated" }} 
              priority
            />
            
            <WorldMapOverlay 
              categoryStats={stats?.categoryStats ?? {}} 
              activeTree={activeTree}
            />
          </div>
        </div>

        {/* Bottom Tab UI & Progress Bar */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8 pt-12">
          
          {/* Roadmap Tabs */}
          <div className="mb-6 flex w-full max-w-4xl gap-2 overflow-x-auto px-6 pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedTreeId("all")}
              className={`flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 font-bold transition-all ${
                selectedTreeId === "all" 
                  ? "bg-amber-400 text-slate-900 shadow-[0_-4px_15px_rgba(251,191,36,0.6)]" 
                  : "bg-white/80 text-slate-700 hover:bg-white"
              }`}
              style={{ transformOrigin: 'bottom', transform: selectedTreeId === "all" ? 'scale(1.05)' : 'scale(1)' }}
            >
              <Map className="h-4 w-4" />
              전체 맵
            </button>
            {userTrees?.map((tree) => (
              <button
                key={tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                className={`flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 font-bold transition-all ${
                  selectedTreeId === tree.id 
                    ? "bg-emerald-400 text-slate-900 shadow-[0_-4px_15px_rgba(52,211,153,0.6)]" 
                    : "bg-white/80 text-slate-700 hover:bg-white"
                }`}
                style={{ transformOrigin: 'bottom', transform: selectedTreeId === tree.id ? 'scale(1.05)' : 'scale(1)' }}
              >
                <Folder className="h-4 w-4" />
                {tree.title}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="h-4 w-full overflow-hidden rounded-full border border-white/40 bg-black/60 shadow-inner backdrop-blur-md">
              <div
                className="h-full rounded-full bg-[#FFE128] shadow-[0_0_12px_rgba(255,225,40,0.8)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
