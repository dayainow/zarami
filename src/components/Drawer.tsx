"use client";

import { useMemo } from "react";

import { useCompleteSkillMutation } from "@/hooks/useCompleteSkillMutation";
import { useSkillStore } from "@/stores/useSkillStore";
import type { SkillNodeData, SkillTreeNode } from "@/types/skill-tree";

type DrawerProps = {
  skills: SkillTreeNode[];
  userId: string | null;
  onClose: () => void;
  onCompleteEffect?: (skillId: string) => void;
};

function renderMarkdownScaffold(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={`${line}-${index}`} className="mt-5 text-sm font-semibold text-slate-200">
            {line.replace("### ", "")}
          </h3>
        );
      }

      if (line.startsWith("## ")) {
        return (
          <h2 key={`${line}-${index}`} className="mt-1 text-lg font-bold text-white">
            {line.replace("## ", "")}
          </h2>
        );
      }

      if (line.startsWith("- ")) {
        return (
          <li key={`${line}-${index}`} className="ml-5 list-disc text-sm leading-6 text-slate-300">
            {line.replace("- ", "")}
          </li>
        );
      }

      return (
        <p key={`${line}-${index}`} className="text-sm leading-6 text-slate-300">
          {line}
        </p>
      );
    });
}

export function Drawer({ skills, userId, onClose, onCompleteEffect }: DrawerProps) {
  const selectedSkillId = useSkillStore((state) => state.selectedSkillId);
  const completedSkillIds = useSkillStore((state) => state.completedSkillIds);
  const completeSkillMutation = useCompleteSkillMutation();

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId),
    [selectedSkillId, skills],
  );

  const data = selectedSkill?.data as SkillNodeData | undefined;
  const isCompleted =
    Boolean(data?.is_completed) || (selectedSkillId ? completedSkillIds.includes(selectedSkillId) : false);
  const isCompleting = completeSkillMutation.isPending;

  const handleComplete = () => {
    if (!selectedSkillId || isCompleted || isCompleting) {
      return;
    }

    // Optimistic UI + network dispatch happen inside the mutation (onMutate
    // flips the store instantly; mutationFn is queued/paused if offline).
    completeSkillMutation.mutate({ skillId: selectedSkillId, userId });
    onCompleteEffect?.(selectedSkillId);
  };

  return (
    <aside
      className={[
        "pointer-events-none fixed inset-y-0 right-0 z-40 flex w-full justify-end",
        selectedSkill ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
      aria-hidden={!selectedSkill}
    >
      <div
        className={[
          "pointer-events-auto h-full w-full border-l border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out",
          "md:w-[35vw] md:min-w-[380px] md:max-w-[560px]",
          selectedSkill ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-white/10 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                  {data?.category ?? "Skill"}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{data?.title ?? "스킬 상세"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{data?.description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="드로워 닫기"
              >
                x
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-slate-400">예상 시간</p>
                <p className="mt-1 text-lg font-semibold text-white">{data?.estimatedMinutes ?? 30}분</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-slate-400">상태</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {isCompleted ? "완료" : data?.isNextAction ? "다음 행동" : "진행 가능"}
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="space-y-3">
                {data?.questMarkdown ? renderMarkdownScaffold(data.questMarkdown) : null}
              </div>
            </section>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-white">체크리스트</h3>
              <div className="mt-3 space-y-2">
                {(data?.checklist ?? []).map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-emerald-400"
                      defaultChecked={isCompleted}
                    />
                    <span className={isCompleted ? "line-through opacity-60" : ""}>{item}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <footer className="border-t border-white/10 p-6">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleted || isCompleting || !selectedSkillId}
              className={[
                "h-12 w-full rounded-lg px-4 text-sm font-bold transition",
                isCompleted
                  ? "cursor-not-allowed bg-emerald-400/20 text-emerald-200"
                  : "bg-sky-400 text-slate-950 shadow-lg shadow-sky-950/30 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-70",
              ].join(" ")}
            >
              {isCompleted ? "물주기 완료" : isCompleting ? "저장 중" : "물주기"}
            </button>
            {completeSkillMutation.isPaused ? (
              <p className="mt-2 text-center text-xs text-amber-300">
                오프라인 상태입니다. 재연결되면 자동으로 동기화됩니다.
              </p>
            ) : null}
          </footer>
        </div>
      </div>
    </aside>
  );
}
