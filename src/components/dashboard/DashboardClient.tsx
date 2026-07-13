"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, TreePine, ChevronDown } from "lucide-react";

import { Drawer } from "@/components/Drawer";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSupabaseUserId } from "@/hooks/useSupabaseUserId";
import { findSkillTrend, useSkillTrends } from "@/hooks/useSkillTrends";
import { useToggleNodeCompletion, useUserTree, useUserTrees } from "@/hooks/useUserTree";
import { getLayoutedElements } from "@/lib/autoLayout";
import { useSkillStore } from "@/stores/useSkillStore";
import { useStreakStore } from "@/stores/useStreakStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";
import { formatEstimatedTime } from "@/utils/format";

export function DashboardClient() {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const userId = useSupabaseUserId();
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const { data: treeList } = useUserTrees(userId);
  const { data: myTree, isLoading: isMyTreeLoading } = useUserTree(currentTreeId);
  const { data: skillTrends } = useSkillTrends();
  const toggleCompletionMutation = useToggleNodeCompletion(userId);
  const isOnline = useOnlineStatus();
  const openDrawer = useSkillStore((state) => state.openDrawer);
  const closeDrawer = useSkillStore((state) => state.closeDrawer);
  const toastError = useSkillStore((state) => state.toastError);
  const dismissToast = useSkillStore((state) => state.dismissToast);
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const recordActivity = useStreakStore((state) => state.recordActivity);
  const [celebratingSkillId, setCelebratingSkillId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("has_seen_canvas_onboarding");
    if (!hasSeen && userId) {
      setShowOnboarding(true);
    }
  }, [userId]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("has_seen_canvas_onboarding", "true");
  }, []);

  useEffect(() => {
    if (!currentTreeId && treeList && treeList.length > 0) {
      setCurrentTreeId(treeList[0].id);
    }
  }, [currentTreeId, treeList]);

  const nodeIds = useMemo(() => new Set(myTree?.nodes.map((node) => node.id) ?? []), [myTree?.nodes]);

  useEffect(() => {
    const syncSelectedNodeFromUrl = () => {
      setSelectedNodeId(new URLSearchParams(window.location.search).get("node"));
    };

    syncSelectedNodeFromUrl();
    window.addEventListener("popstate", syncSelectedNodeFromUrl);

    return () => {
      window.removeEventListener("popstate", syncSelectedNodeFromUrl);
    };
  }, []);

  useEffect(() => {
    if (selectedNodeId && nodeIds.has(selectedNodeId)) {
      openDrawer(selectedNodeId);
      return;
    }

    closeDrawer();
  }, [closeDrawer, nodeIds, openDrawer, selectedNodeId]);

  // Completion truth is node.data.is_completed, persisted directly inside
  // the tree's own nodes JSONB by ManageTreeClient's toggle (and this
  // page's Drawer, via useToggleNodeCompletion) - both surfaces read and
  // write the exact same field, so they can never silently disagree.
  const nodes = useMemo<SkillTreeNode[]>(() => {
    if (!myTree) return [];

    const withStatus = myTree.nodes.map((node) => {
      const prerequisiteIds = node.data.prerequisiteIds ?? [];
      const isCompleted = node.data.is_completed === true;
      const completedIds = new Set(myTree.nodes.filter((n) => n.data.is_completed === true).map((n) => n.id));
      const prerequisitesCompleted =
        prerequisiteIds.length === 0 || prerequisiteIds.every((skillId: string) => completedIds.has(skillId));
      const isNextAction = !isCompleted && prerequisiteIds.length > 0 && prerequisitesCompleted;
      const status: SkillNodeData["status"] = isCompleted
        ? "completed"
        : prerequisitesCompleted
          ? "available"
          : "locked";

      // Personal tree nodes don't share ids with the skills catalog, so
      // job-market evidence is matched by title text - undefined (no
      // match) just means no evidence section renders, not an error.
      const trend = skillTrends ? findSkillTrend(node.data.title, skillTrends) : undefined;

      return {
        ...node,
        data: {
          ...node.data,
          is_completed: isCompleted,
          isNextAction,
          isCelebrating: celebratingSkillId === node.id,
          status,
          isTrending: node.data.isTrending || trend?.trend_score === "High",
          trendScore: (trend?.trend_score as SkillNodeData["trendScore"]) ?? undefined,
          wantedMentions: trend?.wanted_mentions ?? undefined,
          jumpitMentions: trend?.jumpit_mentions ?? undefined,
          totalPostingsAnalyzed: trend?.total_postings_analyzed ?? undefined,
          trendUpdatedAt: trend?.trend_updated_at ?? undefined,
          samplePostings: trend?.sample_postings ?? undefined,
        },
      };
    });

    // Grow the tree bottom-up from completed roots instead of the data
    // file's fixed positions, so the canvas reads as a plant growing upward.
    return getLayoutedElements(withStatus, myTree.edges, "BT").nodes;
  }, [myTree, celebratingSkillId, skillTrends]);

  const edges = useMemo<SkillTreeEdge[]>(() => {
    if (!myTree) return [];
    const completedIds = new Set(myTree.nodes.filter((n) => n.data.is_completed === true).map((n) => n.id));
    const nextActionIds = new Set(nodes.filter((node) => node.data.isNextAction).map((node) => node.id));

    return myTree.edges.map((edge) => {
      const isNextAction = nextActionIds.has(edge.target);
      // A completed source lights the edge up like a cleared skill-tree path,
      // unless the amber "next action" highlight already claims this edge.
      const isActivated = !isNextAction && completedIds.has(edge.source);

      return {
        ...edge,
        animated: Boolean(edge.animated || isNextAction),
        style: {
          strokeWidth: isNextAction ? 3 : isActivated ? 2.5 : 2.25,
          stroke: isNextAction ? "#fbbf24" : isActivated ? "#10b981" : "#94a3b8",
          filter: isActivated ? "drop-shadow(0 0 4px rgba(16, 185, 129, 0.65))" : undefined,
        },
      };
    });
  }, [myTree, nodes]);

  const handleNodeSelect = useCallback(
    (node: SkillTreeNode) => {
      setSelectedNodeId(node.id);
      router.push(`/dashboard?node=${node.id}`, { scroll: false });
      dismissOnboarding();
    },
    [router, dismissOnboarding],
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedNodeId(null);
    closeDrawer();
    router.push("/dashboard", { scroll: false });
  }, [closeDrawer, router]);

  const handleCompleteEffect = useCallback(
    (skillId: string) => {
      setCelebratingSkillId(skillId);
      recordActivity();
      window.setTimeout(() => {
        setCelebratingSkillId((currentSkillId) => (currentSkillId === skillId ? null : currentSkillId));
      }, 1400);
    },
    [recordActivity],
  );

  const handleToggleComplete = useCallback(
    (nodeId: string) => {
      if (!myTree) return;
      toggleCompletionMutation.mutate({ tree: myTree, nodeId });
    },
    [myTree, toggleCompletionMutation],
  );

  const completedCount = useMemo(() => {
    if (!myTree) return 0;
    return myTree.nodes.filter((node) => node.data.is_completed === true).length;
  }, [myTree]);

  const totalCount = myTree?.nodes.length ?? 0;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 mesh-gradient text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="absolute inset-x-0 top-0 z-20 border-b border-white/40 bg-white/60 px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.05)] backdrop-blur-3xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Zarami Dashboard
            </p>
            <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-start md:gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                기술트리 성장 캔버스
              </h1>
              {treeList && treeList.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative inline-flex items-center">
                      <select
                        className="appearance-none cursor-pointer rounded-xl border border-slate-200/80 bg-white/75 py-2 pl-4 pr-10 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-xl transition-all hover:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/80"
                        value={currentTreeId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) setCurrentTreeId(val);
                        }}
                      >
                        <option value="" disabled>로드맵 선택</option>
                        {treeList.map(tree => (
                          <option key={tree.id} value={tree.id}>{tree.title === "나의 테크트리" ? "나만의 커스텀 트리" : tree.title}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 flex items-center text-slate-400 dark:text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                    <Link
                      href="/manage-tree"
                      className="group flex h-9 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 text-xs font-bold text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                    >
                      <span className="mr-1 text-base leading-none">+</span> 새 로드맵
                    </Link>
                  </div>
                  {myTree && (
                    <div className="group relative w-max pl-1">
                      <span className="cursor-help border-b border-dashed border-slate-300/80 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200">
                        {`선택한 로드맵: ${myTree.title === "나의 테크트리" ? "나만의 커스텀 트리" : myTree.title} | ${progress}% 완료 | 총 예상 소요 ${formatEstimatedTime(myTree.nodes.reduce((acc, node) => acc + (typeof node.data.estimatedMinutes === 'number' ? node.data.estimatedMinutes : 0), 0))}`}
                      </span>
                      <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-50 w-max rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                        💡 진행 상태는 로드맵별로 독립적으로 자동 저장됩니다.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_20px_rgba(52,211,153,0.6)] transition-all duration-700 ease-out dark:from-emerald-500 dark:to-teal-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200">
              {!userId ? "아직 스킬트리가 없어요. 로그인 후 바로 시작" : `${progress}% 완료 (${completedCount}/${totalCount})`}
            </span>

            {currentStreak > 0 ? (
              <span className="flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-gradient-to-br from-amber-400 to-orange-500 px-3 py-1.5 text-sm font-black text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] backdrop-blur-md">
                <Flame className="h-4 w-4 animate-pulse" aria-hidden />
                {currentStreak}일 연속
              </span>
            ) : null}

            <div className="h-6 w-px bg-slate-200/80 dark:bg-white/10" />
            
            <ThemeToggle className="hidden md:flex" />

            <div className="h-6 w-px bg-slate-200/80 dark:bg-white/10 hidden md:block" />

            {!userId ? (
              // Empty state handles the main CTA when logged out, so we don't need a duplicate here in the header
              null
            ) : isMyTreeLoading ? null : (
              <Link
                href="/manage-tree"
                className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <TreePine className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                {totalCount === 0 ? (
                  "내 트리 시작하기"
                ) : (
                  <>
                    내 트리 {completedCount}/{totalCount}
                  </>
                )}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>

      {toastError ? (
        <div className="absolute left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-red-200/80 bg-white/85 px-4 py-3 text-sm text-red-700 shadow-xl shadow-red-950/10 backdrop-blur-2xl dark:border-red-300/30 dark:bg-red-950/80 dark:text-red-100">
          <div className="flex items-center justify-between gap-4">
            <span>{toastError}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="font-semibold text-red-600 transition hover:text-red-800 dark:text-red-200 dark:hover:text-white"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {nodes.length === 0 && !isMyTreeLoading ? (
        <div className="grid h-screen min-h-screen place-items-center px-5 pt-20">
          <div className="max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 text-center shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
              <TreePine className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              {userId ? "아직 만든 로드맵이 없어요" : "로그인하고 로드맵을 만들어보세요"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {userId
                ? "내 트리 관리에서 AI로 커리어 로드맵을 만들면 여기서 진행 상황을 확인할 수 있어요."
                : "목표를 입력하면 AI가 나만의 커리어 로드맵을 만들어줘요. 로그인 후 바로 시작할 수 있어요."}
            </p>
            <Link
              href={userId ? "/manage-tree" : "/login"}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
            >
              {userId ? "로드맵 만들러 가기" : "로그인하고 내 스킬트리 만들기"}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 캔버스 내 진행률 오버레이 */}
          <div className="pointer-events-none absolute left-1/2 top-28 z-30 flex w-full max-w-sm -translate-x-1/2 flex-col items-center px-4">
            <div className="w-full rounded-2xl border border-white/60 bg-white/70 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">진행률</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {progress}% ({completedCount}/{totalCount})
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <TechTreeCanvas
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
            className="h-screen min-h-screen pt-20"
          />
          {showOnboarding && (
            <div className="absolute bottom-10 left-1/2 z-40 flex w-max -translate-x-1/2 flex-col items-center animate-bounce">
              <div className="relative rounded-2xl border border-sky-200/50 bg-white/95 px-5 py-3 shadow-[0_10px_40px_rgba(14,165,233,0.3)] backdrop-blur-xl dark:border-sky-400/20 dark:bg-slate-900/95 dark:shadow-[0_10px_40px_rgba(14,165,233,0.15)]">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-xl">💡</span> 노드를 클릭하면 퀘스트 상세를 확인할 수 있어요!
                </p>
                <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-sky-200/50 bg-white/95 dark:border-sky-400/20 dark:bg-slate-900/95" />
              </div>
              <button
                type="button"
                onClick={dismissOnboarding}
                className="mt-4 rounded-full bg-slate-900/10 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-900/20 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              >
                알겠어요
              </button>
            </div>
          )}
        </>
      )}

      <Drawer
        skills={nodes}
        onClose={handleCloseDrawer}
        onToggleComplete={handleToggleComplete}
        onCompleteEffect={handleCompleteEffect}
        isCompleting={toggleCompletionMutation.isPending}
        isOffline={!isOnline}
      />
    </main>
  );
}
