"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import { CheckCircle2, Download, LayoutGrid, Plus, Save, Sparkles, Target, Trash2 } from "lucide-react";

import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { useMagicLinkAuth } from "@/hooks/useMagicLinkAuth";
import { useSaveUserTree, useUserTree, useUserTrees } from "@/hooks/useUserTree";
import { getLayoutedElements } from "@/lib/autoLayout";
import { useStreakStore } from "@/stores/useStreakStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

function createBlankRootNode(): SkillTreeNode {
  return {
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
  };
}

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
  const { userId, loginEmail, setLoginEmail, isSending, emailSent, handleLogin, handleTestLogin, authChecked } =
    useMagicLinkAuth();
  
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const { data: treeList } = useUserTrees(userId);
  const { data: savedTree, isLoading: isTreeLoading } = useUserTree(currentTreeId);
  const saveTreeMutation = useSaveUserTree(userId);
  const recordActivity = useStreakStore((state) => state.recordActivity);

  const [nodes, setNodes, onNodesChange] = useNodesState<SkillTreeNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<SkillTreeEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "copied" | "error">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [onboardingGoal, setOnboardingGoal] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const reactFlowInstanceRef = useRef<ReactFlowInstance<SkillTreeNode, SkillTreeEdge> | null>(null);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => getLayoutedElements(currentNodes, edges, "BT").nodes);
    window.setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [edges, setNodes]);

  // `promptOverride` lets the onboarding form pass its typed goal directly;
  // the toolbar's "AI 자동 생성" button opens the custom modal which eventually
  // calls this function with the submitted text.
  const handleAIGenerate = useCallback(async (promptOverride?: string) => {
    const promptText = promptOverride ?? promptInput;
    if (!promptText || promptText.trim() === "") return;
    
    setIsPromptOpen(false);
    setPromptInput("");
    setCurrentTreeId(null); // Create a new tree
    setNodes([]); // Clear canvas
    setEdges([]);

    setIsGeneratingAI(true);
    try {
      const response = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const data = await response.json();
      const layouted = getLayoutedElements(data.nodes, data.edges, "BT");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      window.setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
      }, 50);
      setSelectedNodeId(data.nodes[0]?.id ?? null);
    } catch (error: unknown) {
      alert("AI 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingAI(false);
    }
  }, [promptInput, setNodes, setEdges]);

  // Hydrate from the user's saved tree whenever currentTreeId changes
  useEffect(() => {
    if (!savedTree) {
      if (currentTreeId === null && treeList && treeList.length > 0) {
        // Automatically select the first tree if none is selected
        setCurrentTreeId(treeList[0].id);
      }
      return;
    }

    if (savedTree.nodes.length > 0) {
      setNodes(savedTree.nodes);
      setEdges(savedTree.edges);
      setSelectedNodeId(savedTree.nodes[0]?.id ?? null);
    } else {
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
    }
  }, [savedTree, treeList, currentTreeId, setEdges, setNodes]);

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

  const handleStartBlank = useCallback(() => {
    const rootNode = createBlankRootNode();
    setCurrentTreeId(null); // Create a new tree
    setNodes([rootNode]);
    setEdges([]);
    setSelectedNodeId(rootNode.id);
  }, [setEdges, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    if (!window.confirm("이 노드를 삭제하시겠습니까? 연결된 화살표도 함께 삭제됩니다.")) {
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setEdges, setNodes]);

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

  const handleSave = useCallback(() => {
    setSaveState("saving");
    const title = treeList?.find(t => t.id === currentTreeId)?.title || "새 로드맵";
    saveTreeMutation.mutate(
      { id: currentTreeId || undefined, title, nodes, edges },
      {
        onSuccess: (data: { id: string } | null | undefined) => {
          if (data?.id && !currentTreeId) {
            setCurrentTreeId(data.id);
          }
          setSaveState("saved");
          window.setTimeout(() => setSaveState("idle"), 1800);
        },
        onError: () => {
          setSaveState("error");
          window.setTimeout(() => setSaveState("idle"), 1800);
        },
      },
    );
  }, [edges, nodes, currentTreeId, treeList, saveTreeMutation]);

  // Debounced auto-save so edits aren't lost if the user navigates away
  // without remembering to click [저장]. Skipped while the tree is still
  // loading or empty (onboarding screen) - there's nothing worth saving yet.
  useEffect(() => {
    if (isTreeLoading || nodes.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const title = treeList?.find(t => t.id === currentTreeId)?.title || "새 로드맵";
      saveTreeMutation.mutate(
        { id: currentTreeId || undefined, title, nodes, edges },
        {
          onSuccess: (data: { id: string } | null | undefined) => {
            if (data?.id && !currentTreeId) {
              setCurrentTreeId(data.id);
            }
            // Auto-save is silent, do not flash the button
          },
          onError: () => {
            // Auto-save errors shouldn't interrupt the user, but we could log it
            console.error("Auto-save failed");
          },
        },
      );
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [nodes, edges, isTreeLoading, currentTreeId, treeList, saveTreeMutation]);

  const data = selectedNode?.data;

  if (!authChecked || !userId) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="max-w-sm rounded-xl border border-white/70 bg-white/75 p-6 text-center shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <h1 className="text-lg font-bold text-slate-950 dark:text-white">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            내 트리는 계정별로 저장됩니다. 로그인 후 이용해주세요.
          </p>
          {!authChecked ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">확인 중...</p>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              {emailSent ? (
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  이메일로 로그인 링크를 보냈습니다!
                </p>
              ) : (
                <div className="flex w-full flex-col gap-4">
                  <form onSubmit={handleLogin} className="flex w-full flex-col gap-2">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      placeholder="이메일 주소 입력"
                      required
                      className="w-full rounded-md border border-slate-200/80 bg-white/75 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950 dark:shadow-sky-950/30 dark:hover:bg-sky-300"
                    >
                      {isSending ? "전송 중..." : "매직 링크로 로그인"}
                    </button>
                  </form>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                    <span className="shrink-0 px-3 text-xs text-slate-400">또는</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleTestLogin}
                    disabled={isSending}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    테스트 계정으로 바로 로그인
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // A brand-new (or emptied) tree leads with AI generation instead of a
  // fixed demo starter - describing a goal is the primary entry point,
  // with "직접 만들기" as the explicit opt-out for manual editing.
  if (!isTreeLoading && nodes.length === 0) {
    return (
      <main className="grid min-h-screen w-full place-items-center bg-slate-50 mesh-gradient px-5 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white/60 p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/50 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
          
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] glow-sky">
            <Sparkles className="h-10 w-10 animate-pulse" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">첫 트리를 만들어볼까요?</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            어떤 커리어를 목표로 하시나요? AI가 목표에 맞는 스킬 트리 초안을 자동으로 만들어드립니다.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleAIGenerate(onboardingGoal);
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              type="text"
              value={onboardingGoal}
              onChange={(event) => setOnboardingGoal(event.target.value)}
              placeholder="예: 풀스택 개발자, 데이터 엔지니어, iOS 개발자..."
              disabled={isGeneratingAI}
              className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3.5 text-base text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all duration-300 hover:border-sky-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={isGeneratingAI || onboardingGoal.trim() === ""}
              className="group relative mt-2 inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 p-[1px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.6)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_30px_-10px_rgba(99,102,241,0.8)] disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100"></span>
              <span className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 px-4 py-2 transition-all">
                <Sparkles className="h-5 w-5" aria-hidden />
                {isGeneratingAI ? "AI가 로드맵을 설계하고 있습니다..." : "AI로 커리어 로드맵 생성하기"}
              </span>
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
            <span className="shrink-0 px-3 text-xs text-slate-400">또는</span>
            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleStartBlank}
            disabled={isGeneratingAI}
            className="text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
          >
            직접 처음부터 만들기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white xl:h-screen xl:flex-row">
      <section className="relative flex min-h-[620px] min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-20 border-b border-white/60 bg-white/70 px-6 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                My Tree Studio
              </p>
              <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                내 트리 관리
                {treeList && treeList.length > 0 && (
                  <select
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                    value={currentTreeId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) setCurrentTreeId(val);
                    }}
                  >
                    <option value="" disabled>로드맵 선택</option>
                    {treeList.map(tree => (
                      <option key={tree.id} value={tree.id}>{tree.title}</option>
                    ))}
                  </select>
                )}
              </h1>
              {isTreeLoading ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">저장된 트리 불러오는 중...</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPromptOpen(true)}
                disabled={isGeneratingAI}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-500 px-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-50 dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-300"
              >
                <span>✨</span>
                {isGeneratingAI ? "생성 중..." : "AI 자동 생성"}
              </button>
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
                onClick={handleAutoLayout}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                자동 정렬
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveTreeMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saveState === "saved"
                  ? "저장됨!"
                  : saveState === "error"
                    ? "저장 실패"
                    : saveState === "saving"
                      ? "저장 중..."
                      : "저장"}
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
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
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
            <button
              type="button"
              onClick={() => {
                const willBeCompleted = !data.is_completed;
                updateSelectedNodeData({
                  is_completed: willBeCompleted,
                  completedAt: willBeCompleted ? new Date().toISOString() : undefined,
                  status: willBeCompleted ? "completed" : "available",
                });
                if (willBeCompleted) {
                  recordActivity();
                }
              }}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition",
                data.is_completed
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  : "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300",
              ].join(" ")}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {data.is_completed ? "완료 취소" : "완료로 표시"}
            </button>

            <button
              type="button"
              onClick={handleDeleteNode}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              노드 삭제
            </button>

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
              <p className="font-semibold text-slate-950 dark:text-white">자동 저장 안내</p>
              <p className="mt-2 leading-6">
                편집을 멈추면 잠시 후 자동으로 저장됩니다. 바로 저장하고 싶다면 상단의 [저장] 버튼을
                눌러주세요.
              </p>
            </section>
          </div>
        )}
      </aside>

      {/* Custom AI Prompt Modal */}
      {isPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm transition-all dark:bg-black/60">
          <div
            className="w-full max-w-md scale-100 transform overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 text-left align-middle shadow-2xl backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/40"
          >
            <h3 className="text-lg font-bold leading-6 text-slate-950 dark:text-white">
              AI 로드맵 재설계
            </h3>
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                현재 트리를 지우고 완전히 새로운 커리어 로드맵을 설계하시겠습니까? 어떤 목표를 원하시는지 입력해주세요.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAIGenerate(promptInput);
              }}
              className="mt-4"
            >
              <input
                type="text"
                autoFocus
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="예: 풀스택 개발자, 프론트엔드 리드..."
                className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromptOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!promptInput.trim() || isGeneratingAI}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
