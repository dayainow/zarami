"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Loader2, Plus, LayoutGrid, Save, FolderOpen, MoreVertical, X, AlertCircle, Edit2, Check, Sparkles, Target, Lightbulb, CheckCircle2, Download, Pencil, Trash2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { useMagicLinkAuth } from "@/hooks/useMagicLinkAuth";
import {
  useDeleteUserTree,
  useRenameUserTree,
  useSaveUserTree,
  useUserTree,
  useUserTrees,
} from "@/hooks/useUserTree";
import { useProfileStats } from "@/hooks/useProfileStats";
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
  const searchParams = useSearchParams();
  const router = useRouter();

  const { userId, loginEmail, setLoginEmail, isSending, emailSent, handleLogin, handleTestLogin, authChecked } =
    useMagicLinkAuth();
  
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const { data: treeList } = useUserTrees(userId);
  const { data: savedTree, isLoading: isTreeLoading } = useUserTree(currentTreeId);
  const saveTreeMutation = useSaveUserTree(userId);
  // `saveTreeMutation.mutate` (not the mutation object itself) is what
  // stays referentially stable across renders in TanStack Query - the
  // object as a whole changes identity on every isPending/isSuccess
  // transition, so depending on it directly used to make the debounced
  // autosave effect below re-schedule on every save's own state change,
  // occasionally firing several overlapping saves that each still saw a
  // stale null currentTreeId and created a duplicate tree via POST.
  const saveTree = saveTreeMutation.mutate;
  const renameTreeMutation = useRenameUserTree(userId);
  const deleteTreeMutation = useDeleteUserTree(userId);
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
  const [promptTargetCompanyInput, setPromptTargetCompanyInput] = useState("");
  const [promptCareerLevel, setPromptCareerLevel] = useState("junior");
  const [onboardingCareerLevel, setOnboardingCareerLevel] = useState("junior");
  
  // Tab state for the AI modal
  const [aiModalTab, setAiModalTab] = useState<"general" | "gap">("general");
  const [jdInput, setJdInput] = useState("");

  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<{ title: string; description: string; category: string }[]>([]);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  const { data: stats } = useProfileStats(userId);

  // Tracked as its own piece of state (not derived from treeList.find(...))
  // because a freshly AI-generated tree has no id/treeList entry yet until
  // the first save - deriving it would always fall back to a generic name
  // for brand-new roadmaps, which is exactly the bug this fixes.
  const [currentTreeTitle, setCurrentTreeTitle] = useState("새 로드맵");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  // Same "own state, not derived" reasoning as currentTreeTitle - a
  // freshly-generated tree has no treeList entry to derive from yet.
  const [targetCompany, setTargetCompany] = useState("");
  const [isEditingTargetCompany, setIsEditingTargetCompany] = useState(false);
  const [targetCompanyInput, setTargetCompanyInput] = useState("");
  const reactFlowInstanceRef = useRef<ReactFlowInstance<SkillTreeNode, SkillTreeEdge> | null>(null);
  const hasAutoSelectedInitialTreeRef = useRef(false);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => getLayoutedElements(currentNodes, edges, "BT").nodes);
    window.setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [edges, setNodes]);

  const handleRecommendNode = useCallback(async () => {
    if (nodes.length === 0) {
      alert("먼저 로드맵에 최소 1개 이상의 노드가 있어야 추천을 받을 수 있습니다.");
      return;
    }
    setIsRecommending(true);
    try {
      const res = await fetch("/api/recommend-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      });
      if (!res.ok) throw new Error("Failed to get recommendations");
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setShowRecommendationsModal(true);
    } catch (error) {
      alert("추천을 받아오는 중 오류가 발생했습니다.");
    } finally {
      setIsRecommending(false);
    }
  }, [nodes]);

  // `promptOverride` lets the onboarding form pass its typed goal directly;
  // the toolbar's "AI 자동 생성" button opens the custom modal which eventually
  // calls this function with the submitted text. `targetCompanyOverride`
  // works the same way for the optional target-company field - each caller
  // owns its own draft input since the modal creates a separate new tree
  // from whatever's currently loaded.
  const handleAIGenerate = useCallback(async (promptOverride?: string, targetCompanyOverride?: string, careerLevelOverride?: string) => {
    const promptText = promptOverride ?? promptInput;
    if (!promptText || promptText.trim() === "") return;
    const targetCompanyText = (targetCompanyOverride ?? "").trim();
    const careerLevelText = careerLevelOverride ?? promptCareerLevel;

    setIsPromptOpen(false);
    setPromptInput("");
    setPromptTargetCompanyInput("");
    setPromptCareerLevel("junior");
    setCurrentTreeId(null); // Create a new tree
    setNodes([]); // Clear canvas
    setEdges([]);

    setIsGeneratingAI(true);
    try {
      const response = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, targetCompany: targetCompanyText, careerLevel: careerLevelText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const data = await response.json();
      const layouted = getLayoutedElements(data.nodes, data.edges, "BT");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setCurrentTreeTitle(data.title || `${promptText} 로드맵`);
      setTargetCompany(targetCompanyText);
      window.setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
      }, 50);
      setSelectedNodeId(data.nodes[0]?.id ?? null);
    } catch (error: unknown) {
      alert("AI 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingAI(false);
    }
  }, [promptInput, promptCareerLevel, setNodes, setEdges]);

  const handleGapGenerate = useCallback(async () => {
    if (!jdInput || jdInput.trim() === "") return;

    setIsPromptOpen(false);
    setJdInput("");
    setAiModalTab("general");
    setCurrentTreeId(null); // Create a new tree
    setNodes([]); // Clear canvas
    setEdges([]);

    setIsGeneratingAI(true);
    try {
      const response = await fetch("/api/generate-gap-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jdInput, completedSkills: stats?.completedSkills || [] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const data = await response.json();
      const layouted = getLayoutedElements(data.nodes, data.edges, "BT");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setCurrentTreeTitle(data.title || `JD 갭 보완 로드맵`);
      setTargetCompany("JD 갭 분석 로드맵");
      window.setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
      }, 50);
      setSelectedNodeId(data.nodes[0]?.id ?? null);
    } catch (error: unknown) {
      alert("AI 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingAI(false);
    }
  }, [jdInput, stats, setNodes, setEdges]);

  // Hydrate from the user's saved tree whenever currentTreeId changes.
  // The "auto-select the first tree" fallback below must only ever fire
  // once, on first load - otherwise it races handleAIGenerate/handleStartBlank
  // (which set currentTreeId to null to signal "create a new tree") and
  // silently re-selects the old tree, so the new generation's autosave
  // overwrites it instead of creating a separate one.
  useEffect(() => {
    if (!savedTree) {
      if (!hasAutoSelectedInitialTreeRef.current && currentTreeId === null && treeList && treeList.length > 0) {
        hasAutoSelectedInitialTreeRef.current = true;
        setCurrentTreeId(treeList[0].id);
      }
      return;
    }

    hasAutoSelectedInitialTreeRef.current = true;
    setCurrentTreeTitle(savedTree.title || "새 로드맵");
    setTargetCompany(savedTree.targetCompany || "");

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

  // Handle URL parameter for automatic AI generation from Trends page
  useEffect(() => {
    const generateSkill = searchParams.get("generateSkill");
    if (generateSkill && authChecked && userId && !isGeneratingAI) {
      // Small timeout to allow states to settle before starting Generation
      setTimeout(() => {
        handleAIGenerate(`최신 채용 트렌드 반영: ${generateSkill} 마스터를 위한 실무 기반 로드맵`);
        // Remove the parameter from the URL so it doesn't trigger again on reload
        router.replace("/manage-tree");
      }, 500);
    }
  }, [searchParams, authChecked, userId, isGeneratingAI, handleAIGenerate, router]);

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
    setCurrentTreeTitle("새 로드맵");
    setTargetCompany("");
    setSelectedNodeId(rootNode.id);
  }, [setEdges, setNodes]);

  const handleStartRename = useCallback(() => {
    setRenameInput(currentTreeTitle);
    setIsRenaming(true);
  }, [currentTreeTitle]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameInput.trim();
    setIsRenaming(false);
    if (!trimmed || trimmed === currentTreeTitle) {
      return;
    }

    setCurrentTreeTitle(trimmed);
    // Not-yet-saved trees (currentTreeId still null) simply pick up the new
    // title on their first save - nothing to rename in the DB yet.
    if (currentTreeId) {
      renameTreeMutation.mutate({ treeId: currentTreeId, title: trimmed });
    }
  }, [renameInput, currentTreeTitle, currentTreeId, renameTreeMutation]);

  const handleStartTargetCompanyEdit = useCallback(() => {
    setTargetCompanyInput(targetCompany);
    setIsEditingTargetCompany(true);
  }, [targetCompany]);

  const handleTargetCompanySubmit = useCallback(() => {
    const trimmed = targetCompanyInput.trim();
    setIsEditingTargetCompany(false);
    if (trimmed === targetCompany) {
      return;
    }

    setTargetCompany(trimmed);
    // Same as title: an unsaved tree just picks this up on its next save.
    // useRenameUserTree only touches the title column, so target_company
    // edits go through the full save mutation instead.
    if (currentTreeId) {
      saveTree({ id: currentTreeId, title: currentTreeTitle, targetCompany: trimmed, nodes, edges });
    }
  }, [targetCompanyInput, targetCompany, currentTreeId, currentTreeTitle, nodes, edges, saveTree]);

  const handleDeleteTree = useCallback(() => {
    if (!currentTreeId) return;
    if (!window.confirm(`"${currentTreeTitle}" 로드맵을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
      return;
    }

    deleteTreeMutation.mutate(currentTreeId, {
      onSuccess: () => {
        const remaining = (treeList ?? []).filter((tree) => tree.id !== currentTreeId);
        if (remaining.length > 0) {
          setCurrentTreeId(remaining[0].id);
        } else {
          setCurrentTreeId(null);
          setNodes([]);
          setEdges([]);
          setCurrentTreeTitle("새 로드맵");
          setTargetCompany("");
        }
      },
    });
  }, [currentTreeId, currentTreeTitle, deleteTreeMutation, treeList, setNodes, setEdges]);

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
    saveTree(
      { id: currentTreeId || undefined, title: currentTreeTitle, targetCompany, nodes, edges },
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
  }, [edges, nodes, currentTreeId, currentTreeTitle, targetCompany, saveTree]);

  // Debounced auto-save so edits aren't lost if the user navigates away
  // without remembering to click [저장]. Skipped while the tree is still
  // loading or empty (onboarding screen) - there's nothing worth saving yet.
  useEffect(() => {
    if (isTreeLoading || nodes.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveTree(
        { id: currentTreeId || undefined, title: currentTreeTitle, targetCompany, nodes, edges },
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
  }, [nodes, edges, isTreeLoading, currentTreeId, currentTreeTitle, targetCompany, saveTree]);

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
              void handleAIGenerate(onboardingGoal, targetCompany, onboardingCareerLevel);
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
            <input
              type="text"
              value={targetCompany}
              onChange={(event) => setTargetCompany(event.target.value)}
              placeholder="목표 기업 또는 직무 (선택, 예: 네이버, 카카오, 토스)"
              disabled={isGeneratingAI}
              className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all duration-300 hover:border-sky-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-slate-500"
            />
            <select
              value={onboardingCareerLevel}
              onChange={(event) => setOnboardingCareerLevel(event.target.value)}
              disabled={isGeneratingAI}
              className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-sky-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
            >
              <option value="junior">🌱 주니어 (기본기 중심)</option>
              <option value="mid">🚀 미들 (심화 및 문제 해결)</option>
              <option value="senior">🎯 시니어 (아키텍처 및 성능 최적화)</option>
            </select>
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
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                내 트리 관리
                {treeList && treeList.length > 0 && (
                  <>
                    {isRenaming ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit();
                          if (e.key === "Escape") setIsRenaming(false);
                        }}
                        className="rounded-md border border-sky-400 bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm outline-none dark:bg-slate-900 dark:text-slate-200"
                      />
                    ) : (
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
                    {!isRenaming ? (
                      <>
                        <button
                          type="button"
                          onClick={handleStartRename}
                          aria-label="로드맵 이름 변경"
                          title="이름 변경"
                          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteTree}
                          disabled={!currentTreeId}
                          aria-label="로드맵 삭제"
                          title={currentTreeId ? "로드맵 삭제" : "저장 후 삭제할 수 있습니다"}
                          className="grid h-8 w-8 place-items-center rounded-md border border-red-200 bg-red-50/60 text-red-500 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </>
                    ) : null}
                  </>
                )}
              </h1>
              {isTreeLoading ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">저장된 트리 불러오는 중...</p>
              ) : null}
              {!isTreeLoading && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Target className="h-3.5 w-3.5" aria-hidden />
                  {isEditingTargetCompany ? (
                    <input
                      type="text"
                      autoFocus
                      value={targetCompanyInput}
                      onChange={(e) => setTargetCompanyInput(e.target.value)}
                      onBlur={handleTargetCompanySubmit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTargetCompanySubmit();
                        if (e.key === "Escape") setIsEditingTargetCompany(false);
                      }}
                      placeholder="목표 기업 또는 직무 (예: 네이버, 카카오)"
                      className="rounded-md border border-sky-400 bg-white px-2 py-0.5 text-xs text-slate-700 shadow-sm outline-none dark:bg-slate-900 dark:text-slate-200"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartTargetCompanyEdit}
                      className="underline-offset-2 hover:text-slate-800 hover:underline dark:hover:text-slate-200"
                    >
                      {targetCompany ? `목표 기업: ${targetCompany}` : "목표 기업 추가하기"}
                    </button>
                  )}
                </div>
              )}
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
                onClick={handleRecommendNode}
                disabled={isRecommending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
              >
                <Lightbulb className="h-4 w-4" aria-hidden />
                {isRecommending ? "생각 중..." : "AI 노드 추천"}
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
            <div className="mb-4 flex gap-4 border-b border-slate-200 dark:border-slate-700">
              <button
                className={`pb-2 text-sm font-bold ${aiModalTab === "general" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                onClick={() => setAiModalTab("general")}
              >
                일반 로드맵
              </button>
              <button
                className={`pb-2 text-sm font-bold ${aiModalTab === "gap" ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                onClick={() => setAiModalTab("gap")}
              >
                JD 갭 분석
              </button>
            </div>

            {aiModalTab === "general" ? (
              <>
                <div className="mt-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    지금 보고 있는 로드맵은 그대로 남고, 별도의 새 로드맵이 만들어집니다. 어떤 목표를
                    원하시는지 입력해주세요.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAIGenerate(promptInput, promptTargetCompanyInput, promptCareerLevel);
                  }}
                  className="mt-4 flex flex-col gap-3"
                >
                  <input
                    type="text"
                    autoFocus
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="예: 풀스택 개발자, 프론트엔드 리드..."
                    className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  />
                  <input
                    type="text"
                    value={promptTargetCompanyInput}
                    onChange={(e) => setPromptTargetCompanyInput(e.target.value)}
                    placeholder="목표 기업 또는 직무 (선택, 예: 네이버, 카카오, 토스)"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  />
                  <select
                    value={promptCareerLevel}
                    onChange={(e) => setPromptCareerLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  >
                    <option value="junior">🌱 주니어 (기본기 중심)</option>
                    <option value="mid">🚀 미들 (심화 및 문제 해결)</option>
                    <option value="senior">🎯 시니어 (아키텍처 및 성능 최적화)</option>
                  </select>

                  <div className="mt-3 flex justify-end gap-3">
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
              </>
            ) : (
              <>
                <div className="mt-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    가고 싶은 회사의 채용 공고(JD) 텍스트를 붙여넣어주세요. 
                    현재 달성한 내 스킬 내역과 비교하여 <b>부족한 기술만</b>으로 갭 보완 로드맵을 설계해 줍니다.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleGapGenerate();
                  }}
                  className="mt-4 flex flex-col gap-3"
                >
                  <textarea
                    autoFocus
                    rows={6}
                    value={jdInput}
                    onChange={(e) => setJdInput(e.target.value)}
                    placeholder="채용 공고 본문 (자격요건, 우대사항 등) 붙여넣기..."
                    className="w-full resize-none rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  />
                  <div className="mt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPromptOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={!jdInput.trim() || isGeneratingAI}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Target className="h-4 w-4" aria-hidden />
                      갭 분석 생성
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Modal */}
      {showRecommendationsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm transition-all dark:bg-black/60">
          <div className="w-full max-w-lg scale-100 transform overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 text-left align-middle shadow-2xl backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold leading-6 text-slate-950 dark:text-white">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                AI 추천 학습 스킬
              </h3>
              <button onClick={() => setShowRecommendationsModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              현재 로드맵 구조를 분석하여 이어서 학습하기 가장 좋은 스킬을 추천해 드립니다.
            </p>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-white">{rec.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{rec.description}</p>
                  <button
                    onClick={() => {
                      const id = Date.now().toString();
                      const x = nodes.length > 0 ? nodes[nodes.length - 1].position.x : 250;
                      const y = nodes.length > 0 ? nodes[nodes.length - 1].position.y + 150 : 250;
                      
                      const newNode: SkillTreeNode = {
                        id,
                        type: "skill",
                        position: { x, y },
                        data: {
                          id,
                          title: rec.title,
                          description: rec.description,
                          category: rec.category as any,
                          is_completed: false,
                          level: 1,
                          status: "available",
                        },
                      };
                      setNodes((nds) => [...nds, newNode]);
                      
                      if (nodes.length > 0) {
                        const newEdge: SkillTreeEdge = {
                          id: `e-${nodes[nodes.length - 1].id}-${id}`,
                          source: nodes[nodes.length - 1].id,
                          target: id,
                          type: "smoothstep",
                          animated: true,
                        };
                        setEdges((eds) => [...eds, newEdge]);
                      }
                      
                      setShowRecommendationsModal(false);
                      setTimeout(handleAutoLayout, 100);
                    }}
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                    이 노드 추가하기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
