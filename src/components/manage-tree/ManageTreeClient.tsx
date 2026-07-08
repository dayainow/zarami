"use client";

import { useCallback, useMemo, useState } from "react";
import { addEdge, useEdgesState, useNodesState, type Connection } from "@xyflow/react";
import { Download, Plus, Target } from "lucide-react";

import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

const initialManageNodes: SkillTreeNode[] = [
  {
    id: "goal-root",
    type: "skill",
    position: { x: 0, y: 80 },
    data: {
      id: "goal-root",
      title: "나만의 커리어 목표",
      description: "올해 달성하고 싶은 최종 목표를 여기에 정의합니다.",
      category: "Goal",
      level: 1,
      estimatedMinutes: 30,
      status: "available",
      questMarkdown: "## 목표 정의\n\n원하는 직무, 프로젝트, 학습 결과를 구체적으로 작성합니다.",
      checklist: ["목표 문장 작성", "완료 기준 정의", "첫 행동 정하기"],
    },
  },
  {
    id: "goal-action-1",
    type: "skill",
    position: { x: 360, y: -80 },
    data: {
      id: "goal-action-1",
      title: "첫 번째 실행 노드",
      description: "목표를 향해 바로 시작할 수 있는 작은 행동입니다.",
      category: "Action",
      level: 2,
      prerequisiteIds: ["goal-root"],
      estimatedMinutes: 45,
      status: "available",
    },
  },
  {
    id: "goal-action-2",
    type: "skill",
    position: { x: 360, y: 240 },
    data: {
      id: "goal-action-2",
      title: "검증 산출물 만들기",
      description: "포트폴리오, 회고, 배포 링크처럼 확인 가능한 결과를 만듭니다.",
      category: "Proof",
      level: 2,
      prerequisiteIds: ["goal-root"],
      estimatedMinutes: 60,
      status: "locked",
    },
  },
];

const initialManageEdges: SkillTreeEdge[] = [
  {
    id: "goal-root-goal-action-1",
    source: "goal-root",
    target: "goal-action-1",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "goal-root-goal-action-2",
    source: "goal-root",
    target: "goal-action-2",
    type: "smoothstep",
  },
];

function createGoalNode(index: number): SkillTreeNode {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `custom-${crypto.randomUUID()}`
      : `custom-${Date.now()}`;

  return {
    id,
    type: "skill",
    position: { x: 720, y: 80 + index * 150 },
    data: {
      id,
      title: `새 목표 노드 ${index + 1}`,
      description: "나만의 실행 과제를 작성하세요.",
      category: "Custom",
      level: 3,
      estimatedMinutes: 30,
      status: "available",
      checklist: ["완료 기준 작성", "필요 자료 정리", "캘린더에 시간 확보"],
    },
  };
}

export function ManageTreeClient() {
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillTreeNode>(initialManageNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<SkillTreeEdge>(initialManageEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("goal-root");
  const [exportState, setExportState] = useState<"idle" | "copied" | "error">("idle");

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const updateSelectedNodeData = useCallback(
    (patch: Partial<SkillNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === selectedNodeId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  const handleAddNode = useCallback(() => {
    const nextNode = createGoalNode(nodes.length);

    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(nextNode.id);
  }, [nodes.length, setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) {
        return;
      }

      setEdges((currentEdges) => addEdge({ ...connection, type: "smoothstep" }, currentEdges));
    },
    [setEdges],
  );

  const handleExport = useCallback(async () => {
    const payload = JSON.stringify({ nodes, edges }, null, 2);

    try {
      await navigator.clipboard.writeText(payload);
      setExportState("copied");
    } catch {
      setExportState("error");
    } finally {
      window.setTimeout(() => setExportState("idle"), 1800);
    }
  }, [edges, nodes]);

  const data = selectedNode?.data;

  return (
    <main className="flex min-h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white xl:h-screen xl:flex-row">
      <section className="relative flex min-h-[620px] min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-20 border-b border-white/60 bg-white/70 px-6 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                My Tree Studio
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                내 트리 관리
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddNode}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
              >
                <Plus className="h-4 w-4" aria-hidden />
                노드 추가
              </button>
              <button
                type="button"
                onClick={() => void handleExport()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <Download className="h-4 w-4" aria-hidden />
                {exportState === "copied" ? "복사됨" : exportState === "error" ? "복사 실패" : "JSON 복사"}
              </button>
            </div>
          </div>
        </div>

        <TechTreeCanvas
          nodes={nodes}
          edges={edges}
          interactive
          onNodeSelect={(node) => setSelectedNodeId(node.id)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          className="h-full min-h-screen pt-24"
        />
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-white/70 bg-white/72 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/72 dark:shadow-black/30 xl:w-[380px] xl:border-l xl:border-t-0">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
            <Target className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Node Settings
            </p>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">목표 노드 편집</h2>
          </div>
        </div>

        {!data ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            캔버스에서 노드를 선택하면 목표 정보를 편집할 수 있습니다.
          </p>
        ) : (
          <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              목표 제목
              <input
                type="text"
                value={data.title}
                onChange={(event) => updateSelectedNodeData({ title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              설명
              <textarea
                value={data.description ?? ""}
                onChange={(event) => updateSelectedNodeData({ description: event.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                분류
                <input
                  type="text"
                  value={data.category ?? ""}
                  onChange={(event) => updateSelectedNodeData({ category: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                예상 시간
                <input
                  type="number"
                  value={data.estimatedMinutes ?? ""}
                  onChange={(event) =>
                    updateSelectedNodeData({
                      estimatedMinutes: event.target.value === "" ? undefined : Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>
            </div>

            <section className="rounded-xl border border-white/70 bg-white/55 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <p className="font-semibold text-slate-950 dark:text-white">다음 단계</p>
              <p className="mt-2 leading-6">
                KAN-7에서 개인 트리 저장소와 동기화되면 이 화면의 노드/엣지 상태가 계정별 데이터로
                저장됩니다.
              </p>
            </section>
          </div>
        )}
      </aside>
    </main>
  );
}
