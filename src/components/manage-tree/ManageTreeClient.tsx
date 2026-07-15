"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Loader2, Plus, LayoutGrid, Save, MoreVertical, X, Sparkles, Target, Lightbulb, CheckCircle2, Download, Pencil, Trash2, ChevronDown, TrendingUp, GitCommit } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const TechTreeCanvas = dynamic(
  () => import("@/components/skill-tree/TechTreeCanvas").then((mod) => mod.TechTreeCanvas),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">에디터 준비 중...</span>
      </div>
    )
  }
);
import TextareaAutosize from "react-textarea-autosize";
import { useMagicLinkAuth } from "@/hooks/useMagicLinkAuth";
import {
  useDeleteUserTree,
  useRenameUserTree,
  useSaveUserTree,
  useUserTree,
  useUserTrees,
} from "@/hooks/useUserTree";
import { useChecklistStore } from "@/stores/useChecklistStore";
import { computeNodeStatus, isNodeNextAction } from "@/utils/nodeStatus";
import { NODE_CATEGORIES } from "@/config/nodeTypes";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useSkillTrends } from "@/hooks/useSkillTrends";
import { getLayoutedElements } from "@/lib/autoLayout";
import { useStreakStore } from "@/stores/useStreakStore";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

function parseQuest(markdown: string | undefined) {
  if (!markdown) return { mission: "", reviewPoints: [] };
  
  const reviewMatch = markdown.match(/###.*리뷰 포인트\s*\n([\s\S]*)/i);
  let reviewPoints: string[] = [];
  let mission = markdown;

  if (reviewMatch && reviewMatch.index !== undefined) {
    const reviewText = reviewMatch[1];
    reviewPoints = reviewText
      .split('\n')
      .map(line => line.trim().replace(/^-\s*/, ''))
      .filter(Boolean);
    
    mission = markdown.slice(0, reviewMatch.index).trim();
  }
  
  mission = mission.replace(/^##.*퀘스트\s*\n/, '').trim();
  
  return { mission, reviewPoints };
}

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "copied" | "error">("idle");
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
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [recommendations, setRecommendations] = useState<{ title: string; description: string; category: string }[]>([]);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  const { data: stats } = useProfileStats(userId);
  const { data: trends } = useSkillTrends();

  const topMissingTrends = useMemo(() => {
    if (!trends) return [];
    const currentTitles = nodes.map(n => n.data.title);
    return trends
      .filter(t => !currentTitles.includes(t.title))
      .sort((a,b) => ((b.wanted_mentions || 0) + (b.jumpit_mentions || 0)) - ((a.wanted_mentions || 0) + (a.jumpit_mentions || 0)))
      .slice(0, 5);
  }, [trends, nodes]);

  const [isAddNodeMenuOpen, setIsAddNodeMenuOpen] = useState(false);

  const checkedKeys = useChecklistStore((s) => s.checkedKeys);

  const visibleNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        status: computeNodeStatus(node, nodes, checkedKeys),
        isNextAction: isNodeNextAction(node, nodes),
      },
    }));
  }, [nodes, checkedKeys]);

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<SkillTreeNode, SkillTreeEdge> | null>(null);
  const hasAutoSelectedInitialTreeRef = useRef(false);
  const loadedTreeIdRef = useRef<string | null>(null);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => getLayoutedElements(currentNodes, edges, "BT").nodes);
    window.setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.24, duration: 600 });
    }, 300);
  }, [nodes, edges, setNodes, setEdges]);

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
    } catch {
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
    
    if (nodes.length > 0) {
      if (!window.confirm("현재 편집 중인 로드맵 캔버스를 닫고 새 로드맵을 만드시겠습니까? (저장하지 않은 변경사항은 사라집니다)")) {
        return;
      }
    }

    const targetCompanyText = (targetCompanyOverride ?? "").trim();
    const careerLevelText = careerLevelOverride ?? promptCareerLevel;

    setIsPromptOpen(false);
    setPromptInput("");
    setPromptTargetCompanyInput("");
    setPromptCareerLevel("junior");
    setCurrentTreeId(null); // Create a new tree
    loadedTreeIdRef.current = null;
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
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 600 });
      }, 300);
    } catch (error: unknown) {
      alert("AI 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingAI(false);
    }
  }, [promptInput, promptCareerLevel, setNodes, setEdges, nodes.length]);

  const handleGapGenerate = useCallback(async () => {
    if (!jdInput || jdInput.trim() === "") return;

    setIsPromptOpen(false);
    setJdInput("");
    setAiModalTab("general");
    setCurrentTreeId(null); // Create a new tree
    loadedTreeIdRef.current = null;
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
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 600 });
      }, 300);
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
      if (!hasAutoSelectedInitialTreeRef.current && currentTreeId === null && treeList) {
        hasAutoSelectedInitialTreeRef.current = true;
        const paramTreeId = searchParams.get("tree");
        if (paramTreeId && treeList.find(t => t.id === paramTreeId)) {
          setCurrentTreeId(paramTreeId);
        } else if (treeList.length > 0) {
          setCurrentTreeId(treeList[0].id);
        }
      }
      return;
    }

    hasAutoSelectedInitialTreeRef.current = true;
    setCurrentTreeTitle(savedTree.title || "새 로드맵");
    setTargetCompany(savedTree.targetCompany || "");

    if (savedTree.nodes.length > 0) {
      setNodes(savedTree.nodes);
      setEdges(savedTree.edges);
      loadedTreeIdRef.current = savedTree.id ?? null;
      window.setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.24, duration: 600 });
      }, 300);
    } else {
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      loadedTreeIdRef.current = savedTree.id ?? null;
    }
  }, [savedTree, treeList, currentTreeId, setEdges, setNodes, searchParams]);



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

  const handleGenerateDetails = useCallback(async () => {
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node?.data.title) return;
    
    setIsGeneratingDetails(true);
    try {
      const res = await fetch("/api/generate-node-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: node.data.title, 
          category: node.data.category, 
          level: node.data.level 
        }),
      });
      if (!res.ok) throw new Error("Failed to generate details");
      const generated = await res.json();
      
      updateSelectedNodeData({
        description: generated.description,
        estimatedMinutes: generated.estimatedMinutes,
        questMarkdown: generated.questMarkdown,
        checklist: generated.checklist,
      });
    } catch (e) {
      console.error(e);
      alert("AI 자동 완성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingDetails(false);
    }
  }, [nodes, selectedNodeId, updateSelectedNodeData]);

  const handleAddNode = useCallback(() => {
    const nextNode = createGoalNode(nodes.length);

    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(nextNode.id);
  }, [nodes.length, setNodes]);

  const handleAddTrendNode = useCallback((trendTitle: string) => {
    const nextNode = createGoalNode(nodes.length);
    nextNode.data.title = trendTitle;
    nextNode.data.description = "채용 시장 트렌드 기반 추천 스킬입니다. 실전 미니 퀘스트를 설계해보세요.";
    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(nextNode.id);
    setIsAddNodeMenuOpen(false);
  }, [nodes.length, setNodes]);

  // Handle URL parameter for adding trend skills from Trends page
  useEffect(() => {
    const addTrendSkill = searchParams.get("addTrendSkill");
    if (addTrendSkill && authChecked && userId && !isGeneratingAI) {
      setTimeout(() => {
        handleAddTrendNode(addTrendSkill);
        router.replace("/manage-tree");
      }, 500);
    }
  }, [searchParams, authChecked, userId, isGeneratingAI, handleAddTrendNode, router]);

  const handleStartBlank = useCallback(() => {
    if (nodes.length > 0) {
      if (!window.confirm("현재 편집 중인 로드맵 캔버스를 닫고 빈 로드맵을 새로 만드시겠습니까? (저장하지 않은 변경사항은 유실됩니다)")) {
        return;
      }
    }
    const rootNode = createBlankRootNode();
    setCurrentTreeId(null); // Create a new tree
    loadedTreeIdRef.current = null;
    setNodes([rootNode]);
    setEdges([]);
    setCurrentTreeTitle("새 로드맵");
    setTargetCompany("");
  }, [nodes.length, setEdges, setNodes]);

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
          loadedTreeIdRef.current = null;
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

  const handleAddChildNode = useCallback((parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    const nextNode = createGoalNode(nodes.length);
    nextNode.position = { x: parentNode.position.x, y: parentNode.position.y - 150 };
    
    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setEdges((currentEdges) => addEdge({ source: parentId, sourceHandle: null, target: nextNode.id, targetHandle: null, type: "smoothstep" }, currentEdges));
    setSelectedNodeId(nextNode.id);
  }, [nodes, setNodes, setEdges]);

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

    // Only auto-save if the canvas nodes actually belong to the currently selected tree.
    // This prevents a stale closure from saving the previous tree's nodes to the new tree's ID
    // during the brief render cycle before hydration completes.
    if (currentTreeId && currentTreeId !== loadedTreeIdRef.current) {
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
  if (!isTreeLoading && nodes.length === 0 && !isGeneratingAI) {
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
      <section className="relative flex min-h-[620px] min-w-0 flex-1 flex-col">
        <div className="z-20 flex-none border-b border-white/60 bg-white/70 px-4 py-3 md:px-6 md:py-4 shadow-sm shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5 md:gap-1">
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                My Tree Studio
              </p>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                내 트리 관리
              </h1>
              {treeList && treeList.length > 0 && (
                <div className="flex w-full items-center gap-2">
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
                      className="flex-1 min-w-0 rounded-md border border-sky-400 bg-white px-2 py-1.5 text-xs md:text-sm font-medium text-slate-700 shadow-sm outline-none dark:bg-slate-900 dark:text-slate-200"
                    />
                  ) : (
                    <select
                      className="flex-1 min-w-0 truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs md:text-sm font-medium text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
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
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteTree}
                        disabled={!currentTreeId}
                        aria-label="로드맵 삭제"
                        title={currentTreeId ? "로드맵 삭제" : "저장 후 삭제할 수 있습니다"}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-red-200 bg-red-50/60 text-red-500 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </>
                  ) : null}
                </div>
              )}
              {isTreeLoading ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">저장된 트리 불러오는 중...</p>
              ) : null}
              {!isTreeLoading && (
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
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
                  {!isEditingTargetCompany && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      (목표 기업을 설정하면 채용 트렌드 우선순위가 연동됩니다)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
              
              {/* 생성 그룹 */}
              <div className="flex items-center gap-1.5 border-r border-slate-200/80 pr-2 md:gap-2 md:pr-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPromptOpen(true)}
                  disabled={isGeneratingAI}
                  className="inline-flex h-9 md:h-10 items-center gap-1.5 md:gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 md:px-4 text-xs md:text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                  {isGeneratingAI ? "생성 중..." : "AI로 새 로드맵 설계"}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAddNodeMenuOpen(!isAddNodeMenuOpen)}
                    className="inline-flex h-9 md:h-10 items-center gap-1.5 md:gap-2 rounded-lg border border-slate-200 bg-white px-2.5 md:px-3 text-xs md:text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                    노드 추가
                    <ChevronDown className="h-3 w-3 ml-0.5 md:ml-1" />
                  </button>
                  
                  {isAddNodeMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsAddNodeMenuOpen(false)}
                      />
                      <div className="absolute right-0 md:left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-[100] dark:border-white/10 dark:bg-slate-900">
                        <div className="mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">직접 추가</div>
                        <button
                          onClick={() => {
                            handleAddNode();
                            setIsAddNodeMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4 text-sky-500 shrink-0" />
                          빈 노드 추가
                        </button>

                        <div className="my-2 h-px w-full bg-slate-100 dark:bg-white/5" />
                        <div className="mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI 추천</div>
                        <button
                          onClick={() => {
                            handleRecommendNode();
                            setIsAddNodeMenuOpen(false);
                          }}
                          disabled={isRecommending}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-amber-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-amber-900/30"
                        >
                          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                          {isRecommending ? "생각 중..." : "AI 추천 노드 추가"}
                        </button>
                        
                        {topMissingTrends && topMissingTrends.length > 0 && (
                          <>
                            <div className="my-2 h-px w-full bg-slate-100 dark:bg-white/5" />
                            <div className="mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">🔥 채용 트렌드 추천 스킬</div>
                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                              {topMissingTrends.map(trend => (
                                <button
                                  key={trend.id}
                                  onClick={() => handleAddTrendNode(trend.title)}
                                  className="group flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-sky-900/30"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <TrendingUp className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span className="truncate">{trend.title}</span>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                                    추가
                                  </span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 편집/저장 그룹 */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  onClick={handleAutoLayout}
                  className="inline-flex h-9 md:h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  title="의존성(Lv.) 기준 자동 정렬"
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">자동 정렬</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveTreeMutation.isPending}
                  className={`inline-flex h-9 md:h-10 items-center gap-1.5 md:gap-2 rounded-lg px-2.5 md:px-4 text-xs md:text-sm font-bold text-white shadow-lg transition-colors ${
                    saveState === "saved"
                      ? "bg-emerald-600 shadow-emerald-600/20 dark:bg-emerald-500"
                      : saveState === "error"
                        ? "bg-red-500 shadow-red-500/20 dark:bg-red-500"
                        : "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                  } disabled:opacity-50`}
                >
                  <Save className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                  {saveState === "saved"
                    ? "저장됨 ✓"
                    : saveState === "error"
                      ? "저장 실패"
                      : saveState === "saving"
                        ? "저장 중..."
                        : "저장"}
                </button>

                {/* 더보기 (고급) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className="inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    aria-label="더보기"
                  >
                    <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </button>
                  
                  {isMoreMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsMoreMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-[100] dark:border-white/10 dark:bg-slate-900">
                        <div className="mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">고급 기능</div>
                        <button
                          onClick={() => {
                            void handleExport();
                            setIsMoreMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Download className="h-4 w-4 shrink-0" aria-hidden />
                          JSON으로 내보내기
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Company Modal */}
        {isEditingTargetCompany && (
          <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">목표 기업 설정</h3>
              </div>
              
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                목표 기업을 설정하면, 이후 <strong className="text-slate-900 dark:text-slate-200">AI 노드 추천</strong> 기능이 해당 기업의 최근 채용 스펙을 우선적으로 반영하여 기술을 추천해 줍니다.
              </p>
              
              <input
                type="text"
                autoFocus
                value={targetCompanyInput}
                onChange={(e) => setTargetCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTargetCompanySubmit();
                  if (e.key === "Escape") setIsEditingTargetCompany(false);
                }}
                placeholder="예: 네이버, 카카오, 토스"
                className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingTargetCompany(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  onClick={handleTargetCompanySubmit}
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}

        {isGeneratingAI && nodes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 min-h-[500px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] glow-sky">
              <Sparkles className="h-8 w-8 animate-pulse" aria-hidden />
            </div>
            <p className="font-semibold text-indigo-500">AI가 맞춤형 로드맵을 심도있게 설계하고 있습니다...</p>
            <p className="text-sm">약 10초 ~ 20초 정도 소요될 수 있습니다.</p>
          </div>
        ) : (
          <TechTreeCanvas
            nodes={visibleNodes}
            edges={edges}
            interactive
            onNodeSelect={(node) => setSelectedNodeId(node.id)}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onAddChild={handleAddChildNode}
            onDeleteNode={handleDeleteNode}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            className="flex-1 min-h-0"
          />
        )}
      </section>

      {/* Mobile Backdrop */}
      {selectedNodeId && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity xl:hidden dark:bg-black/60"
          onClick={() => setSelectedNodeId(null)}
        />
      )}

      <aside className={`
        flex shrink-0 flex-col bg-white/95 p-4 md:p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/30
        transition-transform duration-300 ease-out
        fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/70 max-h-[85vh]
        ${selectedNodeId ? "translate-y-0" : "translate-y-full"}
        xl:relative xl:z-auto xl:w-[380px] xl:max-h-none xl:translate-y-0 xl:rounded-none xl:border-l xl:border-t-0 xl:bg-white/72 xl:dark:bg-slate-900/72
        pb-[env(safe-area-inset-bottom)]
      `}>
        {/* Mobile handle */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 xl:hidden" />
        
        <div className="mt-2 flex items-center justify-between xl:mt-0">
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
          <button 
            className="xl:hidden p-3 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={() => setSelectedNodeId(null)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!data ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            캔버스에서 노드를 선택하면 목표 정보를 편집할 수 있습니다.
          </p>
        ) : (() => {
          const { mission, reviewPoints } = parseQuest(data.questMarkdown);

          const handleMissionChange = (newMission: string) => {
            let combined = `## 🎯 실전 미니 퀘스트\n\n${newMission}`;
            if (reviewPoints.length > 0) {
              combined += `\n\n### ✅ 리뷰 포인트\n${reviewPoints.map(p => `- ${p}`).join('\n')}`;
            }
            updateSelectedNodeData({ questMarkdown: combined });
          };

          const handleReviewPointsChange = (newPointsText: string) => {
            const points = newPointsText.split('\n').map(p => p.trim()).filter(Boolean);
            let combined = `## 🎯 실전 미니 퀘스트\n\n${mission}`;
            if (points.length > 0) {
              combined += `\n\n### ✅ 리뷰 포인트\n${points.map(p => `- ${p}`).join('\n')}`;
            } else if (mission.trim() === "") {
              combined = ""; // clear if both empty
            }
            updateSelectedNodeData({ questMarkdown: combined });
          };

          return (
          <div className="mt-4 md:mt-6 flex flex-col flex-1 min-h-0">
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain pr-2 pb-4">
              
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>목표 제목</span>
                  <button
                    type="button"
                    onClick={handleGenerateDetails}
                    disabled={isGeneratingDetails || !data.title}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-400"
                  >
                    {isGeneratingDetails ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    ✨ AI로 자동 완성
                  </button>
                </div>
                <input
                  type="text"
                  value={data.title}
                  onChange={(event) => updateSelectedNodeData({ title: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                설명
                <TextareaAutosize
                  value={data.description ?? ""}
                  onChange={(event) => updateSelectedNodeData({ description: event.target.value })}
                  minRows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white resize-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  분류
                  <select
                    value={data.category ?? "CORE"}
                    onChange={(event) => updateSelectedNodeData({ category: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm backdrop-blur-xl transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {NODE_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  예상 시간 (분)
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

              {/* Accordion for Advanced Fields */}
              <details className="group rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
                  부가 정보 설정 (미니퀘스트 등)
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-slate-100 p-3 dark:border-white/10">
                  
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-black/20">
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <GitCommit className="h-4 w-4" />
                      GitHub 증빙 링크
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/.../pull/123"
                      value={data.githubLink || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateSelectedNodeData({
                          githubLink: val,
                          certified_by_github: !!val.trim(),
                        });
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    />
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                      PR이나 코드 링크를 첨부하세요. 포트폴리오 전환율이 대폭 상승합니다!
                    </p>
                  </div>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between mb-1">
                      <span>미니 퀘스트 목표 (자유 작성)</span>
                    </div>
                    <TextareaAutosize
                      value={mission}
                      onChange={(event) => handleMissionChange(event.target.value)}
                      minRows={2}
                      placeholder="예) 직접 토이 프로젝트를 만들어봅니다..."
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-black/40 dark:text-white resize-none"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between mb-1">
                      <span>리뷰 포인트 (줄바꿈 구분)</span>
                    </div>
                    <TextareaAutosize
                      value={reviewPoints.join("\n")}
                      onChange={(event) => handleReviewPointsChange(event.target.value)}
                      minRows={2}
                      placeholder="상태를 전역에서 유연하게 사용했는가&#10;불필요한 렌더링을 최소화했는가..."
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-black/40 dark:text-white resize-none"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between mb-1">
                      <span>체크리스트 (줄바꿈 구분)</span>
                      <button
                        type="button"
                        onClick={() => updateSelectedNodeData({ checklist: ["핵심 개념 이해하기", "관련 도구 설치하기", "간단한 예제 구현하기"] })}
                        className="text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
                      >
                        기본 항목 삽입
                      </button>
                    </div>
                    <TextareaAutosize
                      value={data.checklist?.join("\n") ?? ""}
                      onChange={(event) => {
                        const val = event.target.value;
                        updateSelectedNodeData({
                          checklist: val ? val.split("\n").map(s => s.trim()).filter(Boolean) : []
                        });
                      }}
                      minRows={3}
                      placeholder="스토어 설계하기&#10;상태 업데이트 적용하기..."
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-white/10 dark:bg-black/40 dark:text-white resize-none"
                    />
                  </label>

                </div>
              </details>

              <section className="rounded-xl border border-white/70 bg-white/55 p-3 text-xs text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                <p className="font-semibold text-slate-950 dark:text-white">자동 저장 안내</p>
                <p className="mt-1 leading-relaxed">
                  편집을 멈추면 잠시 후 자동으로 저장됩니다. 상단의 [저장] 버튼을 누르면 즉시 반영됩니다.
                </p>
              </section>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row gap-2 border-t border-slate-200/50 bg-white/95 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
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
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition",
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
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                노드 삭제
              </button>
            </div>
          </div>
          );
        })()}
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
                    현재 달성한 내 스킬 내역과 비교하여 <b>부족한 기술 기반의 2주 완성 단기 스프린트</b>를 설계해 줍니다.
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
                    placeholder="여기에 원티드나 점핏의 JD(주요업무, 자격요건 등)를 붙여넣어주세요..."
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
                      2주 단기 스프린트 생성
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
                          category: rec.category as string,
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
