"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Drawer } from "@/components/Drawer";
import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { buildCompletedSkillIdSet, dashboardSkillEdges, dashboardSkillNodes } from "@/data/skill-tree";
import { useSupabaseUserId } from "@/hooks/useSupabaseUserId";
import { useSkillStore } from "@/stores/useSkillStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedNodeId = searchParams.get("node");
  const userId = useSupabaseUserId();
  const completedSkillIds = useSkillStore((state) => state.completedSkillIds);
  const openDrawer = useSkillStore((state) => state.openDrawer);
  const closeDrawer = useSkillStore((state) => state.closeDrawer);
  const toastError = useSkillStore((state) => state.toastError);
  const dismissToast = useSkillStore((state) => state.dismissToast);
  const [celebratingSkillId, setCelebratingSkillId] = useState<string | null>(null);

  const nodeIds = useMemo(() => new Set(dashboardSkillNodes.map((node) => node.id)), []);

  useEffect(() => {
    if (selectedNodeId && nodeIds.has(selectedNodeId)) {
      openDrawer(selectedNodeId);
      return;
    }

    closeDrawer();
  }, [closeDrawer, nodeIds, openDrawer, selectedNodeId]);

  const completedSet = useMemo(() => buildCompletedSkillIdSet(completedSkillIds), [completedSkillIds]);

  const nodes = useMemo<SkillTreeNode[]>(() => {
    return dashboardSkillNodes.map((node) => {
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
  }, [celebratingSkillId, completedSet]);

  const edges = useMemo<SkillTreeEdge[]>(() => {
    const nextActionIds = new Set(nodes.filter((node) => node.data.isNextAction).map((node) => node.id));

    return dashboardSkillEdges.map((edge) => ({
      ...edge,
      animated: Boolean(edge.animated || nextActionIds.has(edge.target)),
      style: {
        strokeWidth: nextActionIds.has(edge.target) ? 3 : 2,
        stroke: nextActionIds.has(edge.target) ? "#fbbf24" : "#64748b",
      },
    }));
  }, [nodes]);

  const handleNodeSelect = useCallback(
    (node: SkillTreeNode) => {
      router.push(`/dashboard?node=${node.id}`, { scroll: false });
    },
    [router],
  );

  const handleCloseDrawer = useCallback(() => {
    closeDrawer();
    router.push("/dashboard", { scroll: false });
  }, [closeDrawer, router]);

  const handleCompleteEffect = useCallback((skillId: string) => {
    setCelebratingSkillId(skillId);
    window.setTimeout(() => {
      setCelebratingSkillId((currentSkillId) => (currentSkillId === skillId ? null : currentSkillId));
    }, 1400);
  }, []);

  const completedCount = completedSet.size;
  const totalCount = dashboardSkillNodes.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white dark:bg-black">
      <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-slate-950/80 px-5 py-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Zarami Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">기술트리 성장 캔버스</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-200">
              {completedCount}/{totalCount} 완료
            </span>
          </div>
        </div>
      </div>

      {toastError ? (
        <div className="absolute left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-red-300/30 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <span>{toastError}</span>
            <button type="button" onClick={dismissToast} className="font-semibold text-red-200 hover:text-white">
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
