"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, TreePine } from "lucide-react";

import { Drawer } from "@/components/Drawer";
import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { buildCompletedSkillIdSet, dashboardSkillEdges, dashboardSkillNodes } from "@/data/skill-tree";
import { useSupabaseUserId } from "@/hooks/useSupabaseUserId";
import { useUserTree } from "@/hooks/useUserTree";
import { getLayoutedElements } from "@/lib/autoLayout";
import { useSkillStore } from "@/stores/useSkillStore";
import { useStreakStore } from "@/stores/useStreakStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

export function DashboardClient() {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const userId = useSupabaseUserId();
  const { data: myTree, isLoading: isMyTreeLoading } = useUserTree(userId);
  const completedSkillIds = useSkillStore((state) => state.completedSkillIds);
  const openDrawer = useSkillStore((state) => state.openDrawer);
  const closeDrawer = useSkillStore((state) => state.closeDrawer);
  const toastError = useSkillStore((state) => state.toastError);
  const dismissToast = useSkillStore((state) => state.dismissToast);
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const recordActivity = useStreakStore((state) => state.recordActivity);
  const [celebratingSkillId, setCelebratingSkillId] = useState<string | null>(null);

  const nodeIds = useMemo(() => new Set(dashboardSkillNodes.map((node) => node.id)), []);

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

  const completedSet = useMemo(() => buildCompletedSkillIdSet(completedSkillIds), [completedSkillIds]);

  const nodes = useMemo<SkillTreeNode[]>(() => {
    const withStatus = dashboardSkillNodes.map((node) => {
      const prerequisiteIds = node.data.prerequisiteIds ?? [];
      const isCompleted = completedSet.has(node.id);
      const prerequisitesCompleted =
        prerequisiteIds.length === 0 || prerequisiteIds.every((skillId: string) => completedSet.has(skillId));
      const isNextAction = !isCompleted && prerequisiteIds.length > 0 && prerequisitesCompleted;
      const status: SkillNodeData["status"] = isCompleted
        ? "completed"
        : prerequisitesCompleted
          ? "available"
          : "locked";

      return {
        ...node,
        data: {
          ...node.data,
          is_completed: isCompleted,
          isNextAction,
          isCelebrating: celebratingSkillId === node.id,
          status,
        },
      };
    });

    // Grow the tree bottom-up from completed roots instead of the data
    // file's fixed positions, so the canvas reads as a plant growing upward.
    return getLayoutedElements(withStatus, dashboardSkillEdges, "BT").nodes;
  }, [celebratingSkillId, completedSet]);

  const edges = useMemo<SkillTreeEdge[]>(() => {
    const nextActionIds = new Set(nodes.filter((node) => node.data.isNextAction).map((node) => node.id));

    return dashboardSkillEdges.map((edge) => {
      const isNextAction = nextActionIds.has(edge.target);
      // A completed source lights the edge up like a cleared skill-tree path,
      // unless the amber "next action" highlight already claims this edge.
      const isActivated = !isNextAction && completedSet.has(edge.source);

      return {
        ...edge,
        animated: Boolean(edge.animated || isNextAction),
        style: {
          strokeWidth: isNextAction ? 3 : isActivated ? 2.5 : 2,
          stroke: isNextAction ? "#fbbf24" : isActivated ? "#10b981" : "#64748b",
          filter: isActivated ? "drop-shadow(0 0 4px rgba(16, 185, 129, 0.65))" : undefined,
        },
      };
    });
  }, [completedSet, nodes]);

  const handleNodeSelect = useCallback(
    (node: SkillTreeNode) => {
      setSelectedNodeId(node.id);
      router.push(`/dashboard?node=${node.id}`, { scroll: false });
    },
    [router],
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

  const completedCount = completedSet.size;
  const totalCount = dashboardSkillNodes.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  const myTreeTotalCount = myTree?.nodes.length ?? 0;
  const myTreeCompletedCount = myTree?.nodes.filter((node) => node.data.is_completed).length ?? 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="absolute inset-x-0 top-0 z-20 border-b border-white/60 bg-white/70 px-6 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Zarami Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              기술트리 성장 캔버스
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all dark:bg-emerald-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {completedCount}/{totalCount} 완료
            </span>

            {currentStreak > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Flame className="h-4 w-4" aria-hidden />
                {currentStreak}일 연속
              </span>
            ) : null}

            <div className="h-6 w-px bg-slate-200/80 dark:bg-white/10" />

            {!userId ? (
              <Link
                href="/manage-tree"
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <TreePine className="h-4 w-4" aria-hidden />
                로그인하고 내 트리 만들기
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : isMyTreeLoading ? null : (
              <Link
                href="/manage-tree"
                className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <TreePine className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                {myTreeTotalCount === 0 ? (
                  "내 트리 시작하기"
                ) : (
                  <>
                    내 트리 {myTreeCompletedCount}/{myTreeTotalCount}
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

      <TechTreeCanvas
        nodes={nodes}
        edges={edges}
        onNodeSelect={handleNodeSelect}
        className="h-screen min-h-screen pt-20"
      />

      <Drawer skills={nodes} userId={userId} onClose={handleCloseDrawer} onCompleteEffect={handleCompleteEffect} />
    </main>
  );
}
