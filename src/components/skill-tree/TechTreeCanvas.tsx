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
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

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

const statusClassName: Record<NonNullable<SkillNodeData["status"]>, string> = {
  completed:
    "border-emerald-300/80 bg-emerald-50/80 text-emerald-950 shadow-emerald-100 backdrop-blur-xl dark:border-emerald-400/50 dark:bg-emerald-950/70 dark:text-emerald-100 dark:shadow-emerald-950/20",
  available:
    "border-sky-300/80 bg-white/85 text-slate-950 shadow-sky-100 backdrop-blur-xl dark:border-sky-400/60 dark:bg-slate-900/75 dark:text-slate-50 dark:shadow-sky-950/40",
  locked:
    "border-slate-200/80 bg-slate-100/70 text-slate-400 shadow-slate-100 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/65 dark:text-slate-500",
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
  minZoom: 0.55,
  maxZoom: 1,
};

const proOptions = { hideAttribution: true };

const SkillNode = memo(function SkillNode({ data, selected }: NodeProps<SkillTreeNode>) {
  const status = data.status ?? "available";
  const isCompleted = data.is_completed === true || status === "completed";
  const isNextAction = data.isNextAction === true && !isCompleted;
  const categoryColor = getCategoryColor(data.category);

  return (
    // A div, not a <button>: the branch collapse/expand toggle below needs
    // its own interactive element nested inside, and browsers strip nested
    // interactive semantics from anything inside a real <button>.
    <div
      role="button"
      tabIndex={0}
      className={[
        "group relative w-72 rounded-lg border border-l-4 px-4 py-3 text-left shadow-sm transition duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950",
        selected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950" : "",
        isCompleted ? "opacity-40" : "",
        isNextAction
          ? "animate-pulse border-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.18),0_18px_42px_rgba(251,191,36,0.22)]"
          : "",
        statusClassName[status],
        categoryColor.border,
      ].join(" ")}
    >
      {isNextAction ? (
        <div className="absolute -right-3 -top-3 z-10 rounded-md border border-amber-200 bg-amber-300 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-lg">
          Next Action
        </div>
      ) : null}
      {data.isTrending ? (
        <div className="absolute -left-3 -top-3 z-10 flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-500/30">
          <span className="text-[10px]">🔥</span> 트렌드
        </div>
      ) : null}
      {data.isCelebrating ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg">
          <span className="absolute left-5 top-4 h-2 w-2 animate-bounce rounded-full bg-sky-300" />
          <span className="absolute right-8 top-7 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300" />
          <span className="absolute bottom-4 left-1/2 h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:120ms]" />
        </div>
      ) : null}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            ) : status === "locked" ? (
              <Lock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            ) : (
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassName[status]}`} />
            )}
            {data.category ? (
              <span
                className={`truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryColor.badge}`}
              >
                {data.category}
              </span>
            ) : null}
          </div>
          <h3 className={["mt-2 truncate text-base font-semibold", isCompleted ? "line-through" : ""].join(" ")}>
            {data.title}
          </h3>
          {data.description ? (
            <p
              className={[
                "mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300",
                isCompleted ? "line-through" : "",
              ].join(" ")}
            >
              {data.description}
            </p>
          ) : null}
        </div>
        {typeof data.level === "number" ? (
          <span className="shrink-0 rounded-md bg-slate-900/90 px-2 py-1 text-xs font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
            Lv.{data.level}
          </span>
        ) : null}
      </div>
      {isNextAction ? (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <span className="h-1.5 rounded-full bg-amber-300" />
          <span className="h-1.5 rounded-full bg-sky-300" />
          <span className="h-1.5 rounded-full bg-emerald-300" />
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
      {data.hasChildren ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={data.isCollapsed ? "하위 브랜치 펼치기" : "하위 브랜치 접기"}
          title={data.isCollapsed ? "하위 브랜치 펼치기" : "하위 브랜치 접기"}
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
          className="absolute -right-3 top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-md transition hover:scale-110 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
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
        const isActivated = sourceNode?.data.is_completed === true;
        if (!isActivated) {
          return edge;
        }
        return {
          ...edge,
          style: {
            strokeWidth: 2.5,
            stroke: "#10b981",
            filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.65))",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#10b981",
          },
        };
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
        minZoom={0.2}
        maxZoom={1.6}
        panOnDrag={interactive || !isDrawerOpen}
        zoomOnScroll={interactive || !isDrawerOpen}
        zoomOnPinch={interactive || !isDrawerOpen}
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
        <Background
          color="#94a3b8"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
          className="opacity-60 dark:opacity-45"
        />
        <MiniMap
          pannable={interactive || !isDrawerOpen}
          zoomable={interactive || !isDrawerOpen}
          nodeColor={(node) => {
            const status = (node.data as SkillNodeData | undefined)?.status ?? "available";
            if (status === "completed") return "#10b981";
            if (status === "locked") return "#cbd5e1";
            return "#0ea5e9";
          }}
          className="!border !border-slate-200/80 !bg-white/75 !shadow-lg !backdrop-blur-2xl dark:!border-white/10 dark:!bg-slate-900/80"
        />
        <Controls
          showInteractive={false}
          className="!border !border-slate-200/80 !bg-white/75 !shadow-lg !backdrop-blur-2xl [&_button]:!border-slate-200/80 [&_button]:!bg-white/70 [&_button]:!text-slate-700 hover:[&_button]:!bg-slate-100 dark:!border-white/10 dark:!bg-slate-900/80 dark:[&_button]:!border-white/10 dark:[&_button]:!bg-slate-900/80 dark:[&_button]:!text-white dark:hover:[&_button]:!bg-slate-800"
        />
      </ReactFlow>
    </section>
  );
}
