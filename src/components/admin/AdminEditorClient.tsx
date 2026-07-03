"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { addEdge, useEdgesState, useNodesState, type Connection } from "@xyflow/react";

import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { dashboardSkillEdges, dashboardSkillNodes } from "@/data/skill-tree";
import type { SkillNodeData, SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";
import { createClient } from "@/utils/supabase/client";

function parseIdList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parseChecklist(text: string): string[] {
  return [
    ...new Set(
      text
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

type CopyStatus = "idle" | "copied" | "error";
type AuthStatus = "checking" | "signed-in" | "signed-out";

export function AdminEditorClient() {
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillTreeNode>(dashboardSkillNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<SkillTreeEdge>(dashboardSkillEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // MVP guard: this editor only exports JSON to the clipboard (no DB writes),
  // but it's still internal tooling, so require a signed-in session rather
  // than leaving the route fully public.
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setAuthStatus(data.user ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session?.user ? "signed-in" : "signed-out");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setIsSending(false);
    if (!error) {
      setEmailSent(true);
    } else {
      alert("로그인 이메일 전송에 실패했습니다.");
    }
  }, [email]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const handleNodeSelect = useCallback((node: SkillTreeNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) {
        return;
      }
      setEdges((currentEdges) => addEdge({ ...connection, type: "smoothstep" }, currentEdges));
    },
    [setEdges],
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

  const handleExportJson = useCallback(async () => {
    const exportNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "skill",
      position: node.position,
      data: node.data,
    }));
    const exportEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type ?? "smoothstep",
      animated: edge.animated ?? false,
    }));

    const payload = JSON.stringify({ nodes: exportNodes, edges: exportEdges }, null, 2);

    try {
      await navigator.clipboard.writeText(payload);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }, [edges, nodes]);

  const data = selectedNode?.data;

  if (authStatus !== "signed-in") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-white">
        <div className="max-w-sm rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <h1 className="text-lg font-bold">어드민 로그인이 필요합니다</h1>
          <p className="mt-2 text-sm text-slate-400">
            스킬 노드 편집기는 로그인한 사용자만 이용할 수 있습니다.
          </p>
          {authStatus === "signed-out" ? (
            <div className="mt-6 flex flex-col items-center">
              {emailSent ? (
                <p className="text-sm font-bold text-emerald-400">✅ 이메일로 로그인 링크를 보냈습니다!</p>
              ) : (
                <form onSubmit={handleLogin} className="flex w-full flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소 입력"
                    required
                    className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-300 disabled:opacity-50"
                  >
                    {isSending ? "전송 중..." : "매직 링크로 로그인"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">확인 중...</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="relative flex-1">
        <TechTreeCanvas
          nodes={nodes}
          edges={edges}
          interactive
          onNodeSelect={handleNodeSelect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          className="h-full"
        />
      </div>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">노드 속성</h2>
          <button
            type="button"
            onClick={() => void handleExportJson()}
            className="shrink-0 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-sky-300"
          >
            {copyStatus === "copied" ? "복사됨!" : copyStatus === "error" ? "복사 실패" : "JSON 내보내기"}
          </button>
        </div>

        {!data ? (
          <p className="mt-6 text-sm text-slate-400">캔버스에서 노드를 클릭해 편집하세요.</p>
        ) : (
          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <label className="block text-xs font-semibold text-slate-400">
              제목
              <input
                type="text"
                value={data.title}
                onChange={(event) => updateSelectedNodeData({ title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              설명
              <textarea
                value={data.description ?? ""}
                onChange={(event) => updateSelectedNodeData({ description: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-400">
                카테고리
                <input
                  type="text"
                  value={data.category ?? ""}
                  onChange={(event) => updateSelectedNodeData({ category: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-400">
                레벨
                <input
                  type="number"
                  value={data.level ?? ""}
                  onChange={(event) =>
                    updateSelectedNodeData({
                      level: event.target.value === "" ? undefined : Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-slate-400">
              예상 소요 시간(분)
              <input
                type="number"
                value={data.estimatedMinutes ?? ""}
                onChange={(event) =>
                  updateSelectedNodeData({
                    estimatedMinutes: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              선행 스킬 ID (쉼표로 구분)
              <input
                type="text"
                value={(data.prerequisiteIds ?? []).join(", ")}
                onChange={(event) =>
                  updateSelectedNodeData({ prerequisiteIds: parseIdList(event.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <span className="mt-1 block font-normal normal-case text-slate-500">
                캔버스에서 그린 연결선은 시각적 표시일 뿐이며, 실제 잠금 해제 조건은 이 필드로만
                결정됩니다.
              </span>
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              퀘스트 마크다운
              <textarea
                value={data.questMarkdown ?? ""}
                onChange={(event) => updateSelectedNodeData({ questMarkdown: event.target.value })}
                rows={6}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              체크리스트 (줄바꿈으로 구분)
              <textarea
                value={(data.checklist ?? []).join("\n")}
                onChange={(event) => updateSelectedNodeData({ checklist: parseChecklist(event.target.value) })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <input
                type="checkbox"
                checked={data.is_completed ?? false}
                onChange={(event) => updateSelectedNodeData({ is_completed: event.target.checked })}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-emerald-400"
              />
              기본 완료 상태로 시드
            </label>
          </div>
        )}
      </aside>
    </main>
  );
}
