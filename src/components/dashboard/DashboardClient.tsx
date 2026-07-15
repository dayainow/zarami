"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, TreePine, ChevronDown, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactFlowInstance } from "@xyflow/react";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Drawer } from "@/components/Drawer";
import { useNodesState, useEdgesState } from "@xyflow/react";
import { useChecklistStore } from "@/stores/useChecklistStore";
import { computeNodeStatus, isNodeNextAction } from "@/utils/nodeStatus";

const TechTreeCanvas = dynamic(
  () => import("@/components/skill-tree/TechTreeCanvas").then((mod) => mod.TechTreeCanvas),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">캔버스 준비 중...</span>
      </div>
    )
  }
);

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useMagicLinkAuth } from "@/hooks/useMagicLinkAuth";
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
  const { userId, authChecked } = useMagicLinkAuth();
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
      const searchParams = new URLSearchParams(window.location.search);
      const treeParam = searchParams.get("tree");
      if (treeParam && treeList.some(t => t.id === treeParam)) {
        setCurrentTreeId(treeParam);
      } else {
        setCurrentTreeId(treeList[0].id);
      }
    }
  }, [currentTreeId, treeList]);

  const nodeIds = useMemo(() => new Set(myTree?.nodes.map((node) => node.id) ?? []), [myTree?.nodes]);

  useEffect(() => {
    const syncSelectedNodeFromUrl = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setSelectedNodeId(searchParams.get("node"));
      const treeParam = searchParams.get("tree");
      if (treeParam) {
        setCurrentTreeId(treeParam);
      }
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

  const checkedKeys = useChecklistStore((s) => s.checkedKeys);

  // Derive tree layout only when data changes. (Sync changes are sent directly to the
  // page's Drawer, via useToggleNodeCompletion) - both surfaces read and
  // write the exact same field, so they can never silently disagree.
  const nodes = useMemo<SkillTreeNode[]>(() => {
    if (!myTree) return [];

    const withStatus = myTree.nodes.map((node) => {
      const isCompleted = node.data.is_completed === true;
      const isNextAction = isNodeNextAction(node, myTree.nodes);
      const status = computeNodeStatus(node, myTree.nodes, checkedKeys);

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
  }, [myTree, celebratingSkillId, skillTrends, checkedKeys]);

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

  const [layoutNodes, setLayoutNodes, onNodesChange] = useNodesState<SkillTreeNode>(nodes);
  const [, setLayoutEdges, onEdgesChange] = useEdgesState<SkillTreeEdge>(edges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<SkillTreeNode, SkillTreeEdge> | null>(null);

  useEffect(() => {
    if (nodes.length > 0 && layoutNodes.length === 0) {
      setLayoutNodes(nodes);
    } else if (nodes.length > 0 && layoutNodes.length > 0) {
      setLayoutNodes((current) => {
        return nodes.map((newNode) => {
          const existing = current.find((c) => c.id === newNode.id);
          if (existing) {
            return {
              ...newNode,
              measured: existing.measured,
              position: existing.position,
              selected: existing.selected,
              dragging: existing.dragging,
            };
          }
          return newNode;
        });
      });
    } else if (nodes.length === 0 && layoutNodes.length > 0) {
      setLayoutNodes([]);
    }
  }, [nodes, layoutNodes.length, setLayoutNodes]);

  useEffect(() => {
    if (rfInstance && layoutNodes.length > 0) {
      window.setTimeout(() => {
        rfInstance.fitView({ padding: 0.24, duration: 600 });
      }, 100);
    }
  }, [rfInstance, currentTreeId, layoutNodes.length]); // Trigger fitView when instance is ready or tree changes

  useEffect(() => {
    if (edges.length > 0) {
      setLayoutEdges(edges);
    }
  }, [edges, setLayoutEdges]);

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
    <main className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50 mesh-gradient text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="z-20 flex-none border-b border-white/40 bg-white/60 px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.05)] backdrop-blur-3xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Zarami Dashboard
            </p>
            <div className="mt-1 flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white shrink-0 whitespace-nowrap">
                기술트리 성장 캔버스
              </h1>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {treeList && treeList.length > 0 && (
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
                  )}
                  <Link
                    href={myTree ? `/manage-tree?tree=${myTree.id}` : "/manage-tree"}
                    className="group flex h-9 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 text-xs font-bold text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                  >
                    <span className="mr-1 text-base leading-none">+</span> 새 로드맵
                  </Link>
                </div>
                {treeList && treeList.length > 0 && myTree && (
                  <div className="group relative w-max pl-1">
                    <span className="cursor-help border-b border-dashed border-slate-300/80 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200">
                      {`선택한 로드맵: ${myTree.title === "나의 테크트리" ? "나만의 커스텀 트리" : myTree.title} | ${progress}% 완료 | 총 예상 소요 ${formatEstimatedTime(myTree.nodes.reduce((acc, node) => acc + (typeof node.data.estimatedMinutes === 'number' ? node.data.estimatedMinutes : 0), 0))}`}
                    </span>
                    <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-50 w-max max-w-xs whitespace-normal rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                      💡 진행 상태는 로드맵별로 독립적으로 자동 저장됩니다.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap shrink-0">
            <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_20px_rgba(52,211,153,0.6)] transition-all duration-700 ease-out dark:from-emerald-500 dark:to-teal-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            {!authChecked ? (
              <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200">
                인증 정보 확인 중...
              </span>
            ) : !userId ? (
              <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200">
                아직 스킬트리가 없어요. 로그인 후 바로 시작
              </span>
            ) : totalCount === 0 ? (
              <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200 border-b border-dashed border-slate-400/50">
                로그인 후 첫 퀘스트를 시작하세요
              </span>
            ) : (
              <div className="group relative flex cursor-help items-center">
                <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200 border-b border-dashed border-slate-400/50">
                  {progress}% (스킬 노드: {completedCount}/{totalCount} 완료)
                </span>
                <div className="pointer-events-none absolute right-0 top-full mt-2 z-50 w-max rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                  서브 퀘스트가 아닌 전체 스킬 노드 기준입니다.
                </div>
              </div>
            )}

            {currentStreak > 0 ? (
              <span className="flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-gradient-to-br from-amber-400 to-orange-500 px-3 py-1.5 text-sm font-black text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] backdrop-blur-md">
                <Flame className="h-4 w-4 animate-pulse" aria-hidden />
                {currentStreak}일 연속
              </span>
            ) : null}

            <div className="h-6 w-px bg-slate-200/80 dark:bg-white/10" />
            
            <ThemeToggle className="hidden md:flex" />

            <div className="h-6 w-px bg-slate-200/80 dark:bg-white/10 hidden md:block" />

            {!authChecked || !userId ? (
              // Empty state handles the main CTA when logged out, so we don't need a duplicate here in the header
              null
            ) : isMyTreeLoading ? null : (
              <Link
                href={myTree ? `/manage-tree?tree=${myTree.id}` : "/manage-tree"}
                className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <TreePine className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                {totalCount === 0 ? (
                  "내 스킬트리 만들기"
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

      {isMyTreeLoading ? (
        <div className="flex-1 grid place-items-center px-5">
          <div className="max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 text-center shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-500 shadow-lg shadow-sky-500/20 dark:bg-sky-900/30 dark:text-sky-400 animate-pulse">
              <TreePine className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white animate-pulse">
              기술트리를 불러오는 중...
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      ) : !authChecked ? (
        <div className="flex-1 grid place-items-center px-5">
          <div className="max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 text-center shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white animate-pulse">
              사용자 정보 확인 중...
            </h2>
          </div>
        </div>
      ) : layoutNodes.length === 0 ? (
        <div className="flex-1 grid place-items-center px-5">
          <div className="max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 text-center shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
              <TreePine className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              아직 스킬트리가 없어요
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {userId
                ? "목표를 입력하면 AI가 나만의 커리어 로드맵을 만들어줘요."
                : "목표를 입력하면 AI가 나만의 커리어 로드맵을 만들어줘요. 로그인 후 바로 시작할 수 있어요."}
            </p>
            <Link
              href={userId ? "/manage-tree" : "/login"}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-emerald-900/40 dark:hover:bg-emerald-300"
            >
              <span className="text-lg">✨</span> 
              내 스킬트리 만들기
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <>

          <TechTreeCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeSelect={handleNodeSelect}
            onInit={setRfInstance}
            className="h-[calc(100vh-70px)] w-full"
          />
          {showOnboarding && (
            <div className="absolute bottom-10 left-1/2 z-40 flex w-max -translate-x-1/2 flex-col items-center animate-bounce">
              <div className="relative rounded-2xl border border-sky-200/50 bg-white/95 px-5 py-3 shadow-[0_10px_40px_rgba(14,165,233,0.3)] backdrop-blur-xl dark:border-sky-400/20 dark:bg-slate-900/95 dark:shadow-[0_10px_40px_rgba(14,165,233,0.15)]">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-xl">💡</span> 노드를 클릭하면 퀘스트 상세를 확인할 수 있어요!
                </p>
                <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-sky-200/50 bg-white/95 dark:border-sky-400/20 dark:bg-slate-900/95" />
                <div className="mt-4 flex justify-center">
                  <Link
                    href={myTree ? `/manage-tree?tree=${myTree.id}` : "/manage-tree"}
                    className="flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1.5 text-sm font-bold text-sky-600 transition hover:bg-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400 dark:hover:bg-sky-500/30"
                  >
                    내 로드맵 설정
                  </Link>
                </div>
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
