"use client";

import { memo, useCallback, useMemo, type MouseEvent } from "react";
import ReactFlow, {
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
  type OnNodesChange,
  type ReactFlowInstance,
} from "reactflow";

import { useSkillStore } from "../../stores/useSkillStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "../../types/skill-tree";

type TechTreeCanvasProps = {
  nodes?: SkillTreeNode[];
  edges?: SkillTreeEdge[];
  onNodeSelect?: (node: SkillTreeNode) => void;
  onInit?: (instance: ReactFlowInstance<SkillNodeData>) => void;
  onNodesChange?: OnNodesChange<SkillNodeData>;
  className?: string;
};

const defaultNodes: SkillTreeNode[] = [
  {
    id: "frontend-foundation",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "frontend-foundation",
      title: "Frontend Foundation",
      description: "HTML, CSS, JavaScript fundamentals",
      category: "Core",
      level: 1,
      status: "completed",
    },
  },
  {
    id: "react",
    type: "skill",
    position: { x: 320, y: -120 },
    data: {
      id: "react",
      title: "React",
      description: "Components, hooks, state composition",
      category: "Frontend",
      level: 2,
      status: "available",
    },
  },
  {
    id: "nextjs",
    type: "skill",
    position: { x: 640, y: -120 },
    data: {
      id: "nextjs",
      title: "Next.js",
      description: "App Router, server components, caching",
      category: "Frontend",
      level: 3,
      status: "locked",
    },
  },
  {
    id: "state-management",
    type: "skill",
    position: { x: 320, y: 120 },
    data: {
      id: "state-management",
      title: "State Management",
      description: "Zustand, optimistic UI, persistence",
      category: "Architecture",
      level: 2,
      status: "available",
    },
  },
];

const defaultEdges: SkillTreeEdge[] = [
  {
    id: "frontend-foundation-react",
    source: "frontend-foundation",
    target: "react",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "react-nextjs",
    source: "react",
    target: "nextjs",
    type: "smoothstep",
  },
  {
    id: "frontend-foundation-state-management",
    source: "frontend-foundation",
    target: "state-management",
    type: "smoothstep",
  },
];

const statusClassName: Record<NonNullable<SkillNodeData["status"]>, string> = {
  completed: "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-emerald-100",
  available: "border-sky-400 bg-white text-slate-950 shadow-sky-100",
  locked: "border-slate-200 bg-slate-50 text-slate-400 shadow-slate-100",
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

const SkillNode = memo(function SkillNode({ data, selected }: NodeProps<SkillNodeData>) {
  const status = data.status ?? "available";

  return (
    <button
      type="button"
      className={[
        "group relative w-64 rounded-lg border px-4 py-3 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
        selected ? "ring-2 ring-sky-500 ring-offset-2" : "",
        statusClassName[status],
      ].join(" ")}
    >
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
              <span className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                {data.category}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 truncate text-base font-semibold">{data.title}</h3>
          {data.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{data.description}</p>
          ) : null}
        </div>
        {typeof data.level === "number" ? (
          <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
            Lv.{data.level}
          </span>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
    </button>
  );
});

export function TechTreeCanvas({
  nodes = defaultNodes,
  edges = defaultEdges,
  onNodeSelect,
  onInit,
  onNodesChange,
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
      openDrawer(node.id);
      onNodeSelect?.(node);
    },
    [onNodeSelect, openDrawer],
  );

  return (
    <section
      className={[
        "h-[calc(100vh-4rem)] min-h-[560px] w-full overflow-hidden bg-slate-950",
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
        panOnDrag={!isDrawerOpen}
        zoomOnScroll={!isDrawerOpen}
        zoomOnPinch={!isDrawerOpen}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!isDrawerOpen}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
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
          pannable={!isDrawerOpen}
          zoomable={!isDrawerOpen}
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
