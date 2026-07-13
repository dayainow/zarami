"use client";

import { memo, useCallback, useMemo, useState, type MouseEvent } from "react";
import { ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { CheckCircle2, ChevronDown, ChevronRight, Lock } from "lucide-react";

import { dashboardSkillEdges, dashboardSkillNodes } from "@/data/skill-tree";
import { getCategoryColor } from "@/lib/categoryColors";
import { useSkillStore } from "@/stores/useSkillStore";
import { checklistKey, useChecklistStore } from "@/stores/useChecklistStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";
import { formatEstimatedTime } from "@/utils/format";

type TechTreeCanvasProps = {
  nodes?: SkillTreeNode[];
  edges?: SkillTreeEdge[];
  onNodeSelect?: (node: SkillTreeNode) => void;
  onInit?: (instance: ReactFlowInstance<SkillTreeNode, SkillTreeEdge>) => void;
  onNodesChange?: OnNodesChange<SkillTreeNode>;
  onEdgesChange?: OnEdgesChange<SkillTreeEdge>;
  onConnect?: OnConnect;
  /** Admin editor mode: enables node dragging/connecting and skips the
   * guest-facing drawer on node click (the caller owns selection instead). */
  interactive?: boolean;
  className?: string;
};

const statusClassName: Record<string, string> = {
  completed: "border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20",
  available: "border-l-slate-300 bg-white/95 dark:border-l-slate-600 dark:bg-slate-900/90",
  locked: "border-l-slate-200 bg-slate-50/90 opacity-70 grayscale-[30%] dark:border-l-slate-800 dark:bg-slate-950/80",
};

const statusDotClassName: Record<NonNullable<SkillNodeData["status"]>, string> = {
  completed: "bg-emerald-500",
  available: "bg-sky-500",
  locked: "bg-slate-300",
};

const edgeOptions = {
  style: { strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
} satisfies Partial<Edge>;

const fitViewOptions = {
  padding: 0.24,
  minZoom: 0.1,
  maxZoom: 1.2,
};

const proOptions = { hideAttribution: true };

const categoryTooltips: Record<string, string> = {
  CORE: "💡 기초 개념, 반드시 선행해야 합니다.",
  ACTION: "🛠️ 실습 과제, 코드 작성이 필요합니다.",
  GOAL: "🏆 최종 산출물, 포트폴리오에 연결됩니다.",
  CUSTOM: "✨ 사용자가 직접 추가한 목표입니다.",
};

const SkillNode = memo(function SkillNode({ data, selected }: NodeProps<SkillTreeNode>) {
  const status = data.status ?? "available";
  const isCompleted = data.is_completed === true || status === "completed";
  const isNextAction = data.isNextAction === true && !isCompleted;
  const categoryColor = getCategoryColor(data.category);
  const isGoal = data.category?.toLowerCase() === "goal" || data.id === "goal";
  const categoryTooltip = categoryTooltips[data.category?.toUpperCase() ?? ""] || "스킬 타입";

  const checkedKeys = useChecklistStore((state) => state.checkedKeys);
  const checklistTotal = data.checklist?.length || 0;
  const checklistCompleted = checklistTotal > 0 
    ? data.checklist!.filter(item => checkedKeys[checklistKey(data.id, item)]).length
    : 0;

  // 상태별 확실한 시각적 분리를 위한 클래스 계산
  let stateClasses = "";
  if (status === "locked") {
    stateClasses = "border-dashed border-slate-300 bg-slate-50 opacity-70 grayscale-[50%] dark:border-slate-700 dark:bg-slate-900/50";
  } else if (isCompleted) {
    stateClasses = "border-green-600 bg-green-50 shadow-md shadow-green-600/10 dark:border-green-500 dark:bg-green-950/40";
  } else if (isNextAction) {
    stateClasses = "border-blue-600 bg-blue-50 shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-[pulse_3s_ease-in-out_infinite] dark:border-blue-500 dark:bg-blue-950/40";
  } else {
    // available (진행 전)
    stateClasses = "border-blue-500 bg-white shadow-sm dark:border-blue-400 dark:bg-slate-900";
  }

  // GOAL 노드는 강력한 임팩트 부여
  if (isGoal) {
    if (isCompleted) {
      stateClasses = "scale-[1.10] border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-[0_0_30px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/50 dark:from-emerald-950/40 dark:to-teal-950/20";
    } else {
      stateClasses = "scale-[1.10] border-[#f59e0b] bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-[0_0_30px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/50 dark:from-amber-950/40 dark:to-orange-950/20";
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${data.title}, Lv.${data.level ?? 1}, ${data.estimatedMinutes ? formatEstimatedTime(data.estimatedMinutes) : "시간 미정"}, ${status === "locked" ? "잠김" : isCompleted ? "완료됨" : isNextAction ? "진행 중" : "진행 가능"}`}
      className={[
        "group relative w-72 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950",
        selected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950" : "",
        stateClasses,
      ].join(" ")}
    >
      <div className="absolute -left-2 -top-3 z-10 flex gap-2">
        {data.category ? (
          <div className="group/category relative flex items-center">
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide cursor-help shadow-sm ${categoryColor.badge}`}
            >
              <span className="text-[12px]">{categoryColor.icon}</span>
              {categoryColor.label || data.category}
            </span>
            <div className="pointer-events-none absolute left-0 top-full mt-1 z-50 w-max opacity-0 transition-opacity group-hover/category:opacity-100 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white shadow-lg dark:bg-slate-700">
              {categoryTooltip}
            </div>
          </div>
        ) : null}
      </div>

      {data.isCelebrating ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg">
          <span className="absolute left-5 top-4 h-2 w-2 animate-bounce rounded-full bg-sky-300" />
          <span className="absolute right-8 top-7 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300" />
          <span className="absolute bottom-4 left-1/2 h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:120ms]" />
        </div>
      ) : null}

      <div className="absolute -right-3 -top-4 flex flex-col items-end gap-1.5 z-10">
        {typeof data.estimatedMinutes === "number" ? (
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold tracking-wide text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
            ⏳ {formatEstimatedTime(data.estimatedMinutes)}
          </div>
        ) : null}
        {typeof data.level === "number" ? (
          <span className="rounded-md bg-slate-900/90 px-2 py-1 text-xs font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
            Lv.{data.level}
          </span>
        ) : null}
      </div>

      <Handle
        type="target"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
      
      <div className="flex items-start justify-between gap-3 mt-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
            ) : status === "locked" ? (
              <Lock className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden />
            ) : isNextAction ? (
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            ) : (
              <div className="h-3 w-3 shrink-0 rounded-full border-2 border-blue-500" />
            )}
          </div>
          
          <h3 className={["mt-1 truncate font-bold flex items-center gap-1", isCompleted ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100", isGoal ? "text-lg" : "text-base"].join(" ")}>
            {data.title}
          </h3>
          
          {data.description ? (
            <p
              className={[
                "mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-400",
                isCompleted ? "line-through" : "",
              ].join(" ")}
            >
              {data.description}
            </p>
          ) : null}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
      
      {checklistTotal > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div 
              className="h-full bg-green-500 transition-all" 
              style={{ width: `${(checklistCompleted / checklistTotal) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {checklistCompleted}/{checklistTotal} 완료
          </span>
        </div>
      ) : null}

      {data.hasChildren ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={data.isCollapsed ? "세부 퀘스트 보기" : "세부 퀘스트 숨기기"}
          title={data.isCollapsed ? "세부 퀘스트 보기" : "세부 퀘스트 숨기기"}
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleCollapse?.(data.id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation();
              event.preventDefault();
              data.onToggleCollapse?.(data.id);
            }
          }}
          className="absolute -bottom-2 -right-2 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition-all hover:scale-110 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {data.isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </div>
      ) : null}
    </div>
  );
});

export function TechTreeCanvas({
  nodes = dashboardSkillNodes,
  edges = dashboardSkillEdges,
  onNodeSelect,
  onInit,
  onNodesChange,
  onEdgesChange,
  onConnect,
  interactive = false,
  className,
}: TechTreeCanvasProps) {
  const isDrawerOpen = useSkillStore((state) => state.isDrawerOpen);
  const openDrawer = useSkillStore((state) => state.openDrawer);

  const nodeTypes = useMemo(
    () => ({
      skill: SkillNode,
    }),
    [],
  );

  // Glow edges that flow out of a completed node, so a finished path visibly
  // lights up. Callers (e.g. DashboardClient's Next Action highlight) may
  // already set an explicit edge.style - respect that instead of overriding it.
  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        if (edge.style) {
          return edge;
        }
        const sourceNode = nodes.find((node) => node.id === edge.source);
        const targetNode = nodes.find((node) => node.id === edge.target);
        const isActivated = sourceNode?.data.is_completed === true;
        const isTargetLocked = targetNode?.data.status === "locked";
        const isTargetNextAction = targetNode?.data.isNextAction === true && targetNode?.data.status !== "completed";
        
        if (isActivated) {
          return {
            ...edge,
            animated: isTargetNextAction,
            style: {
              strokeWidth: 2.5,
              stroke: "#16a34a",
              filter: "drop-shadow(0 0 4px rgba(22, 163, 74, 0.4))",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#16a34a",
            },
          };
        }
        
        if (isTargetLocked) {
          return {
            ...edge,
            style: {
              strokeWidth: 2,
              stroke: "#cbd5e1",
              strokeDasharray: "4 4",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#cbd5e1",
            },
          };
        }
        
        return edge;
      }),
    [edges, nodes],
  );

  // Branch collapse/expand: lets large trees hide a subtree behind its root
  // node instead of overwhelming the canvas. Collapse state lives here (not
  // in caller state) since it's purely a view concern over whatever
  // nodes/edges the caller passes in.
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of edges) {
      const children = map.get(edge.source) ?? [];
      children.push(edge.target);
      map.set(edge.source, children);
    }
    return map;
  }, [edges]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    const queue = [...collapsedIds];
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) continue;
      for (const childId of childrenMap.get(current) ?? []) {
        if (!hidden.has(childId)) {
          hidden.add(childId);
          queue.push(childId);
        }
      }
    }
    return hidden;
  }, [collapsedIds, childrenMap]);

  const visibleNodes = useMemo<SkillTreeNode[]>(
    () =>
      nodes
        .filter((node) => !hiddenNodeIds.has(node.id))
        .map((node) => ({
          ...node,
          data: {
            ...node.data,
            hasChildren: (childrenMap.get(node.id)?.length ?? 0) > 0,
            isCollapsed: collapsedIds.has(node.id),
            onToggleCollapse: toggleCollapse,
          },
        })),
    [nodes, hiddenNodeIds, childrenMap, collapsedIds, toggleCollapse],
  );

  const visibleEdges = useMemo(
    () => styledEdges.filter((edge) => !hiddenNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.target)),
    [styledEdges, hiddenNodeIds],
  );

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node<SkillNodeData>) => {
      if (!interactive) {
        openDrawer(node.id);
      }
      onNodeSelect?.(node);
    },
    [interactive, onNodeSelect, openDrawer],
  );

  return (
    <section
      className={[
        "h-[calc(100vh-4rem)] min-h-[560px] w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950",
        className ?? "",
      ].join(" ")}
      aria-label="기술트리 캔버스"
    >
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.1}
        maxZoom={1.6}
        panOnDrag={interactive || !isDrawerOpen}
        zoomOnScroll={interactive || !isDrawerOpen}
        zoomOnPinch={interactive || !isDrawerOpen}
        preventScrolling={false} // allows natural mobile scrolling outside canvas
        panOnScroll={false}
        nodesDraggable={interactive}
        nodesConnectable={interactive}
        elementsSelectable={interactive || !isDrawerOpen}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        proOptions={proOptions}
        className="touch-none"
      >
        <Background color="#64748b" gap={24} size={1} />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const data = node.data as SkillNodeData;
            return data.is_completed ? "#10b981" : "#e2e8f0";
          }}
          className="overflow-hidden rounded-xl border border-slate-200/60 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/50"
        />
        {interactive && <Controls className="overflow-hidden rounded-xl border border-slate-200/60 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/50" />}
      </ReactFlow>
    </section>
  );
}
