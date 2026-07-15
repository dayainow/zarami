"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";

import { useUserTrees } from "@/hooks/useUserTree";
import { createClient } from "@/utils/supabase/client";
import { WorldMapOverlay } from "./WorldMapOverlay";
import { OverworldMap, OCEAN_BG } from "./OverworldMap";
import { getThemeForTree, THEMES } from "./themes";
import { useRouter } from "next/navigation";
import { ArrowLeft, Folder, Compass, ZoomIn, ZoomOut } from "lucide-react";
import type { SkillTreeNode } from "@/types/skill-tree";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export { THEMES, getThemeForTree } from "./themes";

// 지도의 진행률과 단계는 스킬 노드만 센다 (목표 루트 노드 제외)
const isTopLevelNode = (n: SkillTreeNode) => n.type === "skill" || n.type === "custom";

export function WorldMapClient({ initialTreeId = null }: { initialTreeId?: string | null }) {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const userId = sessionUser?.id ?? null;
  const { data: userTrees } = useUserTrees(userId);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(initialTreeId);

  // Drag to scroll for tabs
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
      setAuthChecked(true);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // 선택을 ?tree= 에 반영해 딥링크/새로고침/뒤로가기를 지원한다
  const selectTree = useCallback((treeId: string | null) => {
    if (treeId === selectedTreeId) return;
    setSelectedTreeId(treeId);
    const url = treeId ? `/world-map?tree=${encodeURIComponent(treeId)}` : "/world-map";
    window.history.pushState(null, "", url);
  }, [selectedTreeId]);

  useEffect(() => {
    const onPopState = () => {
      setSelectedTreeId(new URLSearchParams(window.location.search).get("tree"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const activeTree = selectedTreeId === "all" ? undefined : userTrees?.find(t => t.id === selectedTreeId);
  const activeTreeTheme = activeTree ? getThemeForTree(activeTree.id) : THEMES.forest;

  // ESC 로 전체지도 복귀
  useEffect(() => {
    if (!activeTree) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectTree(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTree, selectTree]);

  const topNodes = activeTree ? (activeTree.nodes || []).filter(isTopLevelNode) : [];
  const displayTotalCount = topNodes.length;
  const displayCompletedCount = topNodes.filter((n) => n.data.is_completed).length;
  const progressPercent = displayTotalCount === 0 ? 0 : Math.round((displayCompletedCount / displayTotalCount) * 100);
  const currentStepName = displayTotalCount === 0 
    ? "단계 없음" 
    : displayCompletedCount >= displayTotalCount 
      ? "모든 모험 완료!" 
      : topNodes[displayCompletedCount]?.data.title ?? "";

  // 전체지도용 요약: 섬 현판과 같은 기준(최상위 노드)으로 합산
  const overviewSummary = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const tree of userTrees ?? []) {
      for (const node of tree.nodes || []) {
        if (!isTopLevelNode(node)) continue;
        total++;
        if (node.data.is_completed) done++;
      }
    }
    return { total, done, trees: userTrees?.length ?? 0 };
  }, [userTrees]);

  return (
    <main className="flex h-screen min-h-screen flex-col transition-colors duration-300" style={{ backgroundColor: activeTreeTheme.bgColor }}>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar over the map */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between p-6 md:p-8">
          <div className="pointer-events-auto flex flex-col gap-2">
            {activeTree ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => selectTree(null)}
                  className="flex h-12 w-12 md:h-[4.5rem] md:w-14 shrink-0 items-center justify-center border-[3px] border-black bg-[#FFE128] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[4px_6px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0_rgba(0,0,0,1)]"
                  title="전체지도로 돌아가기 (ESC)"
                >
                  <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                </button>
                <div className="inline-block border-[3px] border-black bg-[#2d2d2d] px-4 py-2 md:px-6 md:py-3 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                  <p className="font-pixel text-base md:text-2xl text-white">
                    {activeTree.title}
                  </p>
                  <p className="mt-0.5 md:mt-1 font-pixel text-xs md:text-sm text-[#FFE128]">
                    {currentStepName} ({displayCompletedCount}/{displayTotalCount})
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-block border-[3px] border-black bg-[#FFE128] px-4 py-2 md:px-6 md:py-3 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <p className="font-pixel text-base md:text-2xl text-black font-bold">
                  나의 모험 일지 (로드맵 목록)
                </p>
                {overviewSummary.trees > 0 && (
                  <p className="mt-0.5 md:mt-1 font-pixel text-xs md:text-sm text-black/70">
                    영토 {overviewSummary.trees}곳 · {overviewSummary.done}/{overviewSummary.total} 완료
                    {overviewSummary.total > 0 && ` (${Math.round((overviewSummary.done / overviewSummary.total) * 100)}%)`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div
          className="relative w-full flex-1 overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: activeTree ? activeTreeTheme.bgColor : OCEAN_BG }}
        >
          {activeTree ? (
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit
              wheel={{ step: 0.1 }}
              pinch={{ step: 5 }}
              limitToBounds={false}
            >
              {({ zoomIn, zoomOut, centerView }) => (
                <>
                  <div className="absolute right-4 top-24 z-30 flex flex-col gap-2">
                    <button onClick={() => centerView(1, 400)} className="rounded-full bg-[#fef3c7] p-2 text-slate-800 shadow-[4px_4px_0_0_rgba(0,0,0,0.8)] border-2 border-slate-900 transition-transform hover:scale-110 active:translate-y-1 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]" title="중앙으로 이동">
                      <Compass className="h-5 w-5" />
                    </button>
                    <button onClick={() => zoomIn(0.5, 400)} className="rounded-full bg-[#fef3c7] p-2 text-slate-800 shadow-[4px_4px_0_0_rgba(0,0,0,0.8)] border-2 border-slate-900 transition-transform hover:scale-110 active:translate-y-1 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]" title="확대">
                      <ZoomIn className="h-5 w-5" />
                    </button>
                    <button onClick={() => zoomOut(0.5, 400)} className="rounded-full bg-[#fef3c7] p-2 text-slate-800 shadow-[4px_4px_0_0_rgba(0,0,0,0.8)] border-2 border-slate-900 transition-transform hover:scale-110 active:translate-y-1 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]" title="축소">
                      <ZoomOut className="h-5 w-5" />
                    </button>
                  </div>

                  {/* react-zoom-pan-pinch 기본 CSS(width: fit-content)가 Tailwind 클래스를
                      이겨 콘텐츠가 0x0으로 붕괴하므로 반드시 인라인 스타일로 크기를 준다 */}
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: "100vmin", height: "100vmin" }}
                  >
                    <div className="relative h-full w-full shadow-2xl">
                      <Image
                        src={activeTreeTheme.mapImage}
                        alt="World Map Base"
                        fill
                        className="object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        style={{ imageRendering: "pixelated", filter: activeTreeTheme.filter }}
                        priority
                        unoptimized
                      />
                      <WorldMapOverlay activeTree={activeTree} theme={activeTreeTheme} />
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          ) : (
            /* 전체지도(로드맵 목록): 로드맵마다 테마가 반영된 영토가 펼쳐진다 */
            <OverworldMap
              trees={authChecked ? (userId ? userTrees : []) : undefined}
              onSelectTree={(treeId) => selectTree(treeId)}
              onCreateTree={() => router.push("/manage-tree")}
            />
          )}
        </div>

        {/* Bottom Tab UI & Progress Bar — 전체지도에서는 숨기고 영토 클릭으로 이동한다 */}
        {activeTree && (
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8 pt-12">
          
          {/* Roadmap Tabs */}
          <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="mb-4 flex w-full max-w-4xl gap-3 overflow-x-auto px-6 pb-4 pt-4 scrollbar-hide select-none cursor-grab active:cursor-grabbing"
          >
            {userTrees?.map((tree) => (
              <button
                key={tree.id}
                onClick={() => selectTree(tree.id)}
                className={`font-pixel flex shrink-0 items-center gap-2 border-[3px] border-black px-4 py-2 md:px-5 md:py-3 transition-all ${
                  selectedTreeId === tree.id 
                    ? "bg-[#6be05c] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-y-2" 
                    : "bg-[#d2b48c] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1"
                }`}
              >
                <Folder className="h-4 w-4 md:h-5 md:w-5 shrink-0 fill-black/20" />
                <span className="max-w-[120px] sm:max-w-[200px] text-sm md:text-base truncate">{tree.title}</span>
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
        )}
      </div>
    </main>
  );
}
