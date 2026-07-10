"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useProfileStats } from "@/hooks/useProfileStats";
import { useUserTrees } from "@/hooks/useUserTree";
import { createClient } from "@/utils/supabase/client";
import { WorldMapOverlay } from "./WorldMapOverlay";
import { Folder, Map, ArrowLeft } from "lucide-react";
import type { SkillTreeNode } from "@/types/skill-tree";

export const THEMES = {
  forest: {
    id: 'forest',
    name: '기본 숲',
    filter: 'none',
    mapImage: '/images/world_map.png',
    icon: '/images/characters/hero_back.png',
    pathColor: '#10b981', // Emerald
    bgColor: '#73C856', // Map wrapper bg
    cardColor: '#6be05c', // Gallery card primary
  },
  desert: {
    id: 'desert',
    name: '사막',
    filter: 'none',
    mapImage: '/images/world_map_desert.png',
    icon: '/images/characters/hero_desert.png',
    pathColor: '#f59e0b',
    bgColor: '#e6c875',
    cardColor: '#fcd34d',
  },
  winter: {
    id: 'winter',
    name: '설원',
    filter: 'none',
    mapImage: '/images/world_map_winter.png',
    icon: '/images/characters/hero_snow.png',
    pathColor: '#38bdf8',
    bgColor: '#a6d6d6',
    cardColor: '#bae6fd',
  },
  volcano: {
    id: 'volcano',
    name: '화산',
    filter: 'none',
    mapImage: '/images/world_map_volcano.png',
    icon: '/images/characters/hero_volcano.png',
    pathColor: '#ef4444',
    bgColor: '#a84545',
    cardColor: '#fca5a5',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: '사이버펑크',
    filter: 'invert(1) hue-rotate(180deg) saturate(1.5)',
    mapImage: '/images/world_map_volcano.png', // Cyberpunk uses inverted volcano map
    icon: '/images/characters/hero_cyber.png',
    pathColor: '#a855f7',
    bgColor: '#231c3b',
    cardColor: '#d8b4fe',
  }
};

export function getThemeForTree(treeId: string) {
  let hash = 0;
  for (let i = 0; i < treeId.length; i++) {
    hash = treeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>;
  return THEMES[themeKeys[index]];
}

export function WorldMapClient() {
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

  const activeTree = selectedTreeId === "all" ? undefined : userTrees?.find(t => t.id === selectedTreeId);
  const activeTreeTheme = activeTree ? getThemeForTree(activeTree.id) : THEMES.forest;

  const displayTotalCount = activeTree 
    ? activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-')).length
    : stats?.totalCount ?? 0;
  
  const displayCompletedCount = activeTree
    ? activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-') && n.data.is_completed).length
    : stats?.completedCount ?? 0;

  const progressPercent = displayTotalCount === 0 ? 0 : Math.round((displayCompletedCount / displayTotalCount) * 100);

  return (
    <main className="flex h-screen min-h-screen flex-col transition-colors duration-300" style={{ backgroundColor: activeTreeTheme.bgColor }}>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar over the map */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between p-6 md:p-8">
          <div className="pointer-events-auto flex flex-col gap-2">
            {activeTree ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTreeId("all")}
                  className="flex h-[4.5rem] w-14 shrink-0 items-center justify-center border-[3px] border-black bg-[#FFE128] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[4px_6px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0_rgba(0,0,0,1)]"
                  title="갤러리로 돌아가기"
                >
                  <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                </button>
                <div className="inline-block border-[3px] border-black bg-[#2d2d2d] px-6 py-3 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                  <p className="font-pixel text-lg md:text-2xl text-white">
                    {activeTree.title} <span className="text-[#FFE128]">({progressPercent}%)</span>
                  </p>
                  <p className="mt-1 font-pixel text-sm text-slate-300">
                    {displayCompletedCount}/{displayTotalCount} 완료
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-block border-[3px] border-black bg-[#FFE128] px-6 py-3 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <p className="font-pixel text-lg md:text-2xl text-black font-bold">
                  나의 모험 일지 (로드맵 목록)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full flex-1 overflow-auto transition-colors duration-300" style={{ backgroundColor: activeTreeTheme.bgColor }}>
          {/* Map Container */}
          <div className="relative h-full w-full">
            <Image 
              src={activeTreeTheme.mapImage} 
              alt="World Map Base" 
              fill 
              className="object-contain object-center transition-all duration-700" 
              style={{ imageRendering: "pixelated", filter: activeTreeTheme.filter }} 
              priority
            />
            
            {activeTree && (
              <WorldMapOverlay 
                categoryStats={stats?.categoryStats ?? {}} 
                activeTree={activeTree}
                theme={activeTreeTheme}
              />
            )}
          </div>
        </div>

        {/* Gallery Overlay (shown only when selectedTreeId === "all") */}
        {!activeTree && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 md:p-8 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-5xl rounded-xl border-[4px] border-black bg-[#d2b48c] p-6 md:p-10 shadow-[8px_8px_0_rgba(0,0,0,1)] mt-16 md:mt-0">
              <h2 className="font-pixel mb-8 text-center text-3xl md:text-5xl text-black drop-shadow-[0_2px_0_rgba(255,255,255,0.8)]">진행 중인 모험</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {userTrees?.map(tree => {
                  const tTotal = tree.nodes.filter(n => !n.id.includes('-')).length;
                  const tCompleted = tree.nodes.filter(n => !n.id.includes('-') && n.data.is_completed).length;
                  const tProgress = tTotal === 0 ? 0 : Math.round((tCompleted / tTotal) * 100);
                  const tTheme = getThemeForTree(tree.id);

                  return (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTreeId(tree.id)}
                      className="group relative flex flex-col items-center justify-center border-[3px] border-black bg-white p-6 transition-all hover:-translate-y-2 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] text-center cursor-pointer"
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.2)]" style={{ backgroundColor: tTheme.cardColor }}>
                        <Map className="h-8 w-8 text-black" />
                      </div>
                      <h3 className="font-pixel mb-3 text-base font-bold text-black truncate w-full px-2 text-center">{tree.title}</h3>
                      <div className="w-full mt-auto">
                        <div className="mb-1 flex justify-between font-pixel text-xs text-slate-500">
                          <span>달성률</span>
                          <span>{tProgress}%</span>
                        </div>
                        <div className="h-4 w-full overflow-hidden border-2 border-black bg-slate-200">
                          <div className="h-full transition-all" style={{ width: `${tProgress}%`, backgroundColor: tTheme.pathColor }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {(!userTrees || userTrees.length === 0) && (
                  <div className="col-span-full py-12 text-center font-pixel text-slate-600">
                    아직 생성된 로드맵이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Tab UI & Progress Bar */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8 pt-12">
          
          {/* Roadmap Tabs */}
          <div className="mb-4 flex w-full max-w-4xl gap-3 overflow-x-auto px-6 pb-4 pt-4 scrollbar-hide">
            {userTrees?.map((tree) => (
              <button
                key={tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                className={`font-pixel flex shrink-0 items-center gap-2 border-[3px] border-black px-5 py-3 transition-all ${
                  selectedTreeId === tree.id 
                    ? "bg-[#6be05c] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-y-2" 
                    : "bg-[#d2b48c] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1"
                }`}
              >
                <Folder className="h-5 w-5 shrink-0 fill-black/20" />
                <span className="max-w-[120px] sm:max-w-[200px] truncate">{tree.title}</span>
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="h-6 w-full overflow-hidden border-[3px] border-black bg-[#2d2d2d] shadow-[0_4px_0_rgba(0,0,0,0.3)]">
              <div
                className="h-full bg-[#FFE128] transition-all"
                style={{ width: `${progressPercent}%`, backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
