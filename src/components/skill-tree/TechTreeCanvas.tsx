"use client";

import { memo, useCallback, useMemo, type MouseEvent } from "react";
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

import { dashboardSkillEdges, dashboardSkillNodes } from "@/data/skill-tree";
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
    "border-emerald-400/70 bg-emerald-50 text-emerald-950 shadow-emerald-100 dark:bg-emerald-950 dark:text-emerald-100",
  available:
    "border-sky-400 bg-white text-slate-950 shadow-sky-100 dark:bg-slate-900 dark:text-slate-50 dark:shadow-sky-950/40",
  locked:
    "border-slate-200 bg-slate-50 text-slate-400 shadow-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500",
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

  return (
    <button
      type="button"
      className={[
        "group relative w-72 rounded-lg border px-4 py-3 text-left shadow-sm transition duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950",
        selected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-950" : "",
        isCompleted ? "opacity-40" : "",
        isNextAction
          ? "animate-pulse border-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.18),0_18px_42px_rgba(251,191,36,0.22)]"
          : "",
        statusClassName[status],
      ].join(" ")}
    >
      {isNextAction ? (
        <div className="absolute -right-3 -top-3 z-10 rounded-md border border-amber-200 bg-amber-300 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-lg">
          Next Action
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
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassName[status]}`} />
            {data.category ? (
              <span className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
          <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
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
    </button>
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
        "h-[calc(100vh-4rem)] min-h-[560px] w-full overflow-hidden bg-slate-950 dark:bg-black",
        className ?? "",
      ].join(" ")}
      aria-label="기술트리 캔버스"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
          color="#475569"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
          className="opacity-50"
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
          className="!border !border-white/10 !bg-slate-900/90"
        />
        <Controls
          showInteractive={false}
          className="!border !border-white/10 !bg-slate-900/90 [&_button]:!border-white/10 [&_button]:!bg-slate-900 [&_button]:!text-white hover:[&_button]:!bg-slate-800"
        />
      </ReactFlow>
    </section>
  );
}
