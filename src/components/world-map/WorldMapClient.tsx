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
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between p-6 md:p-8">
          <div className="pointer-events-auto flex flex-col gap-2">
            {activeTree ? (
              <div className="inline-block border-[3px] border-black bg-[#2d2d2d] px-6 py-3 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <p className="font-pixel text-lg md:text-2xl text-white">
                  {activeTree.title} <span className="text-[#FFE128]">({progressPercent}%)</span>
                </p>
                <p className="mt-1 font-pixel text-sm text-slate-300">
                  {displayCompletedCount}/{displayTotalCount} 완료
                </p>
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
            
            {activeTree && (
              <WorldMapOverlay 
                categoryStats={stats?.categoryStats ?? {}} 
                activeTree={activeTree}
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

                  return (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTreeId(tree.id)}
                      className="group relative flex flex-col items-center justify-center border-[3px] border-black bg-white p-6 transition-all hover:-translate-y-2 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] text-center cursor-pointer"
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-[#FFE128] shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.2)]">
                        <Map className="h-8 w-8 text-black" />
                      </div>
                      <h3 className="font-pixel mb-3 text-lg font-bold text-black line-clamp-2 h-12 flex items-center justify-center w-full">{tree.title}</h3>
                      <div className="w-full mt-auto">
                        <div className="mb-1 flex justify-between font-pixel text-xs text-slate-500">
                          <span>달성률</span>
                          <span>{tProgress}%</span>
                        </div>
                        <div className="h-4 w-full overflow-hidden border-2 border-black bg-slate-200">
                          <div className="h-full bg-[#6be05c] transition-all" style={{ width: `${tProgress}%` }} />
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
            <button
              onClick={() => setSelectedTreeId("all")}
              className={`font-pixel flex shrink-0 items-center gap-2 border-[3px] border-black px-5 py-3 transition-all ${
                selectedTreeId === "all" 
                  ? "bg-[#FFE128] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-y-2" 
                  : "bg-[#d2b48c] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1"
              }`}
            >
              <Map className="h-5 w-5" />
              전체 맵
            </button>
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
