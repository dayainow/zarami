"use client";

import { Fragment, useMemo } from "react";
import { ExternalLink, TrendingUp, X } from "lucide-react";

import { checklistKey, useChecklistStore } from "@/stores/useChecklistStore";
import { useSkillStore } from "@/stores/useSkillStore";
import type { SkillNodeData, SkillTreeNode } from "@/types/skill-tree";

// Matches [label](url) so quest text can link out to real reference docs -
// the rest of the mini markdown parser below stays plain-text only.
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderInlineMarkdown(text: string) {
  const parts: (string | { label: string; url: string })[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MARKDOWN_LINK_PATTERN)) {
    const [fullMatch, label, url] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push({ label, url });
    lastIndex = index + fullMatch.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((part, index) =>
    typeof part === "string" ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <a
        key={index}
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
      >
        {part.label}
      </a>
    ),
  );
}

// Anything under 8 work-hours reads as a single sitting (minutes/hours);
// beyond that, framing it in days is more honest about the real scope of
// bigger skills like "CI/CD 파이프라인" than a raw minute count would be.
function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 8) {
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
  }

  const days = Math.max(1, Math.round(hours / 8));
  return `약 ${days}일`;
}

type DrawerProps = {
  skills: SkillTreeNode[];
  onClose: () => void;
  // The parent owns the actual completion mutation (it needs the full tree
  // to persist node.data.is_completed back to Supabase) - the Drawer only
  // renders state and reports the user's intent to toggle.
  onToggleComplete?: (skillId: string) => void;
  onCompleteEffect?: (skillId: string) => void;
  isCompleting?: boolean;
  isOffline?: boolean;
};

function renderMarkdownScaffold(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={`${line}-${index}`} className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {line.replace("### ", "")}
          </h3>
        );
      }

      if (line.startsWith("## ")) {
        return (
          <h2 key={`${line}-${index}`} className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {line.replace("## ", "")}
          </h2>
        );
      }

      if (line.startsWith("- ")) {
        return (
          <li key={`${line}-${index}`} className="ml-5 list-disc text-sm leading-6 text-slate-600 dark:text-slate-300">
            {renderInlineMarkdown(line.replace("- ", ""))}
          </li>
        );
      }

      return (
        <p key={`${line}-${index}`} className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
}

export function Drawer({
  skills,
  onClose,
  onToggleComplete,
  onCompleteEffect,
  isCompleting = false,
  isOffline = false,
}: DrawerProps) {
  const selectedSkillId = useSkillStore((state) => state.selectedSkillId);
  const checkedKeys = useChecklistStore((state) => state.checkedKeys);
  const toggleChecklistItem = useChecklistStore((state) => state.toggleItem);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId),
    [selectedSkillId, skills],
  );

  const data = selectedSkill?.data as SkillNodeData | undefined;
  const isCompleted = Boolean(data?.is_completed);

  const handleComplete = () => {
    if (!selectedSkillId || isCompleted || isCompleting) {
      return;
    }

    onToggleComplete?.(selectedSkillId);
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
          "pointer-events-auto h-full w-full border-l border-white/70 bg-white/82 text-slate-950 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-slate-950/88 dark:text-white dark:shadow-black/40",
          "md:w-[35vw] md:min-w-[380px] md:max-w-[560px]",
          selectedSkill ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                  {data?.category ?? "Skill"}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {data?.title ?? "스킬 상세"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{data?.description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-white/60 text-slate-500 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="드로워 닫기"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/60 bg-white/55 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs text-slate-500 dark:text-slate-400">예상 시간</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  {formatEstimatedTime(data?.estimatedMinutes ?? 30)}
                </p>
              </div>
              <div className="rounded-lg border border-white/60 bg-white/55 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs text-slate-500 dark:text-slate-400">상태</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  {isCompleted ? "완료" : data?.isNextAction ? "다음 행동" : "진행 가능"}
                </p>
              </div>
            </section>

            {data?.questMarkdown ? (
              <section className="mt-6 rounded-lg border border-white/60 bg-white/55 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="space-y-3">{renderMarkdownScaffold(data.questMarkdown)}</div>
              </section>
            ) : null}

            {data && (data.totalPostingsAnalyzed ?? 0) > 0 ? (
              <section className="mt-6 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-5 shadow-sm backdrop-blur-xl dark:border-emerald-400/20 dark:bg-emerald-500/[0.06]">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  왜 배워야 할까요?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  최근 분석한 채용 공고 <strong>{data.totalPostingsAnalyzed}건</strong> 중{" "}
                  <strong>{(data.wantedMentions ?? 0) + (data.jumpitMentions ?? 0)}건</strong>에서 이 스킬을
                  요구했습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                    원티드 {data.wantedMentions ?? 0}건
                  </span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                    점핏 {data.jumpitMentions ?? 0}건
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-700 shadow-sm dark:text-emerald-200">
                    수요{" "}
                    {data.trendScore === "High" ? "높음" : data.trendScore === "Medium" ? "보통" : "낮음"}
                  </span>
                </div>

                {data.samplePostings && data.samplePostings.length > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-emerald-200/60 pt-4 dark:border-emerald-400/20">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      실제 지원 가능한 공고
                    </p>
                    {data.samplePostings.map((posting, index) => (
                      <a
                        key={`${posting.url}-${index}`}
                        href={posting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm shadow-sm transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{posting.companyName}</span> · {posting.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {posting.site === "wanted" ? "원티드" : "점핏"}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {data?.checklist && data.checklist.length > 0 ? (
              <section className="mt-6">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">체크리스트</h3>
                <div className="mt-3 space-y-2">
                  {data.checklist.map((item) => {
                    const checked =
                      isCompleted ||
                      (selectedSkillId ? Boolean(checkedKeys[checklistKey(selectedSkillId, item)]) : false);
                    return (
                      <label
                        key={item}
                        className="flex items-center gap-3 rounded-lg border border-white/60 bg-white/55 px-3 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 bg-white accent-emerald-500 dark:border-slate-500 dark:bg-slate-900 dark:accent-emerald-400"
                          checked={checked}
                          disabled={isCompleted}
                          onChange={() => {
                            if (selectedSkillId) {
                              toggleChecklistItem(selectedSkillId, item);
                            }
                          }}
                        />
                        <span className={checked ? "line-through opacity-60" : ""}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!data?.questMarkdown && (!data?.checklist || data.checklist.length === 0) ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                이 목표에는 아직 세부 퀘스트가 없어요. 노드를 선택해 직접 설명이나 체크리스트를 추가해보세요.
              </p>
            ) : null}
          </div>

          <footer className="border-t border-slate-200/70 p-6 dark:border-white/10">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleted || isCompleting || !selectedSkillId}
              className={[
                "h-12 w-full rounded-lg px-4 text-sm font-bold transition",
                isCompleted
                  ? "cursor-not-allowed bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                  : "bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950 dark:shadow-sky-950/30 dark:hover:bg-sky-300",
              ].join(" ")}
            >
              {isCompleted ? "물주기 완료" : isCompleting ? "저장 중" : "물주기"}
            </button>
            {isOffline ? (
              <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
                오프라인 상태입니다. 재연결되면 자동으로 동기화됩니다.
              </p>
            ) : null}
          </footer>
        </div>
      </div>
    </aside>
  );
}
