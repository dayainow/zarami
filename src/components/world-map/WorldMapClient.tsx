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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTreeId("all")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105"
                  title="갤러리로 돌아가기"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex flex-col justify-center rounded-2xl border border-white/20 bg-slate-900/80 px-6 py-3 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold tracking-tight text-white">
                      {activeTree.title}
                    </p>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                      진행도 {progressPercent}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    전체 <span className="text-white">{displayTotalCount}</span>개의 실전 퀘스트 중 <span className="text-emerald-400">{displayCompletedCount}</span>개 클리어
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-900/80 px-6 py-3 backdrop-blur-md shadow-2xl">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500 text-white text-xs">
                  🚀
                </span>
                <p className="text-lg font-black tracking-tight text-white">
                  커리어 상황판 (로드맵 목록)
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
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 md:p-8 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/95 p-8 md:p-12 shadow-2xl backdrop-blur-xl mt-16 md:mt-0">
              <div className="mb-10 flex flex-col items-center">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
                  진행 중인 커리어 퀘스트
                </h2>
                <p className="text-slate-400">
                  시장 트렌드와 일치하는 실전 로드맵을 확인하고 GitHub 자산을 쌓아보세요.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {userTrees?.map(tree => {
                  const tTotal = tree.nodes.filter(n => !n.id.includes('-')).length;
                  const tCompleted = tree.nodes.filter(n => !n.id.includes('-') && n.data.is_completed).length;
                  const tProgress = tTotal === 0 ? 0 : Math.round((tCompleted / tTotal) * 100);
                  const tTheme = getThemeForTree(tree.id);
                  const trendMatches = Math.max(1, Math.min(3, Math.floor(tTotal / 3))); // Mock trend logic
                  const githubCerts = Math.floor(tCompleted / 2); // Mock github certs

                  return (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTreeId(tree.id)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:-translate-y-2 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10 text-left"
                    >
                      {/* Top Badges */}
                      <div className="flex w-full justify-between mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                          <Map className="h-6 w-6 text-white opacity-80 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                            🔥 트렌드 일치 {trendMatches}건
                          </span>
                          {githubCerts > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                              ✓ GitHub 인증 {githubCerts}건
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="mb-2 text-lg font-bold text-white tracking-tight">{tree.title}</h3>
                      <p className="text-xs text-slate-400 mb-6 line-clamp-2">실제 채용 공고를 분석하여 생성된 맞춤형 퀘스트 목록입니다.</p>
                      
                      <div className="w-full mt-auto space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span>스펙 달성률</span>
                          <span className="text-emerald-400">{tProgress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${tProgress}%`, backgroundColor: tTheme.pathColor, boxShadow: `0 0 10px ${tTheme.pathColor}` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {(!userTrees || userTrees.length === 0) && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500">
                    <Folder className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">진행 중인 로드맵이 없습니다.</p>
                    <p className="text-sm mt-1">대시보드에서 새로운 로드맵을 생성해 보세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Tab UI & Progress Bar */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-8 pt-16">
          
          {/* Roadmap Tabs */}
          <div className="mb-6 flex w-full max-w-5xl gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
            {userTrees?.map((tree) => (
              <button
                key={tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-5 py-3 transition-all backdrop-blur-md border ${
                  selectedTreeId === tree.id 
                    ? "bg-white/10 border-white/30 text-white shadow-lg shadow-white/5 -translate-y-1" 
                    : "bg-black/40 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Folder className={`h-5 w-5 shrink-0 ${selectedTreeId === tree.id ? 'fill-emerald-500/20 text-emerald-400' : 'opacity-50'}`} />
                <span className="max-w-[150px] sm:max-w-[250px] text-sm font-semibold tracking-tight truncate">{tree.title}</span>
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-5xl px-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-400">전체 스펙 달성률</span>
              <span className="text-sm font-black text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80 backdrop-blur-sm border border-white/5 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercent}%`, backgroundColor: activeTreeTheme.pathColor, boxShadow: `0 0 15px ${activeTreeTheme.pathColor}` }}
              >
                {/* Glossy overlay for the progress bar */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
