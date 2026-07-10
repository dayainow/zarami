"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ExternalLink, Briefcase, FileText, GitCommit, Sparkles } from "lucide-react";

import { buildEmptyHeatmap, useProfileStats } from "@/hooks/useProfileStats";
import { useSkillTrends, findSkillTrend } from "@/hooks/useSkillTrends";
import type { SkillTrend } from "@/hooks/useSkillTrends";
import { createClient } from "@/utils/supabase/client";

function heatmapCellClassName(count: number): string {
  if (count === 0) return "bg-slate-200/80 dark:bg-white/5";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count === 2) return "bg-emerald-300 dark:bg-emerald-700";
  if (count === 3) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-400";
}

// We no longer use getRecommendations since we fetch real postings.

type SessionUser = {
  id: string;
  email: string | null;
};

export function ProfileClient() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const userId = sessionUser?.id ?? null;
  const { data: stats, isLoading: isHeatmapLoading, isError: isHeatmapError } = useProfileStats(userId);
  const { data: trends } = useSkillTrends();

  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState("https://github.com/dayainow/zarami");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ skillTitle: string; reason: string }[] | null>(null);

  const handleGithubSync = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !githubRepoUrl.trim()) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/github-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, repoUrl: githubRepoUrl })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "동기화 실패");
      }

      const data = await res.json();
      setSyncResult(data.certifiedNodes || []);
      // Refresh window to show updated stats and trees
      if (data.certifiedNodes && data.certifiedNodes.length > 0) {
        window.setTimeout(() => window.location.reload(), 3000);
      }
    } catch (err: unknown) {
      alert("GitHub 연동 중 오류: " + (err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const realJobPostings = useMemo(() => {
    if (!trends || !stats?.completedSkills || stats.completedSkills.length === 0) return [];
    
    // Find matching trends for each completed skill
    const matched = stats.completedSkills
      .map(title => findSkillTrend(title, trends))
      .filter(Boolean) as SkillTrend[];
    
    // Flatten and deduplicate postings by URL
    const allPostings = matched.flatMap(t => t.sample_postings || []);
    const uniquePostings = Array.from(new Map(allPostings.map(p => [p.url, p])).values());
    
    return uniquePostings.slice(0, 5); // Show top 5
  }, [trends, stats?.completedSkills]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const totalCount = stats?.totalCount ?? 0;
  const completedCount = stats?.completedCount ?? 0;
  // Guests never fetch stats (query is disabled) and a signed-in user's first
  // render is always mid-fetch, so fall back to the placeholder grid whenever
  // real data isn't available yet - never render a visually empty section.
  const placeholderHeatmap = useMemo(() => buildEmptyHeatmap(), []);
  const heatmapDays = stats?.heatmap ?? placeholderHeatmap;

  const marketFitCoverage = useMemo(() => {
    if (!trends || !stats?.allSkillTitles || stats.allSkillTitles.length === 0) return 0;
    let totalWeight = 0;
    let completedWeight = 0;
    
    for (const title of stats.allSkillTitles) {
      const isCompleted = stats.completedSkills.includes(title);
      const trend = findSkillTrend(title, trends);
      let weight = 1;
      if (trend) {
        if (trend.trend_score === "High") weight = 3;
        else if (trend.trend_score === "Medium") weight = 2;
      }
      totalWeight += weight;
      if (isCompleted) {
        completedWeight += weight;
      }
    }
    
    return totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  }, [trends, stats?.allSkillTitles, stats?.completedSkills]);

  const portfolioConversionRate = useMemo(() => {
    if (!stats || stats.completedCount === 0) return 0;
    return Math.round((stats.githubCertifiedCount / stats.completedCount) * 100);
  }, [stats]);

  const handleLogin = async (e: FormEvent) => {
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
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Zarami Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">성장 기록 요약</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {userId
                ? (sessionUser?.email ?? "로그인된 계정")
                : "게스트로 둘러보는 중입니다. 로그인하면 진행도가 저장돼요."}
            </p>
          </div>
          {userId && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGithubModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-400"
              >
                <GitCommit className="h-4 w-4" />
                GitHub 스킬 인증
              </button>
              <a
                href="/resume"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <FileText className="h-4 w-4" />
                이력서 자동 생성
              </a>
            </div>
          )}
        </header>



        <div className="relative">
          <div className={["grid grid-cols-1 gap-4 md:grid-cols-3", !userId ? "pointer-events-none select-none blur-sm" : ""].join(" ")} aria-hidden={!userId}>
            {/* Top 3 Metrics Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:col-span-3">
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/70 bg-white/70 p-5 text-center shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <p className="flex items-center gap-1 text-3xl font-black text-rose-500">
                  🎯 {marketFitCoverage}%
                </p>
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">시장 적합 스킬 커버리지</p>
                <p className="mt-1 text-[10px] text-slate-500">시장에서 수요가 높은 핵심 기술 달성률</p>
              </div>
              
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/70 bg-white/70 p-5 text-center shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <p className="flex items-center gap-1 text-3xl font-black text-amber-500">
                  ⚔️ {stats?.practicalScore ?? 0}점
                </p>
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">실전 역량 증명 점수</p>
                <p className="mt-1 text-[10px] text-slate-500">미니 퀘스트 기반 실전 프로젝트 수행 증명</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-white/70 bg-white/70 p-5 text-center shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <p className="flex items-center gap-1 text-3xl font-black text-indigo-500">
                  📦 {portfolioConversionRate}%
                </p>
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">포트폴리오 전환율</p>
                <p className="mt-1 text-[10px] text-slate-500">GitHub 등 이력서 실물 자산으로 연결된 비율</p>
              </div>
            </div>

            {/* Middle Row */}
            <div className="flex flex-col gap-4 md:col-span-1">
              <div className="flex-1 rounded-xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
                <h2 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">직무 준비도 맵 (스택 분포)</h2>
                <div className="space-y-3">
                  {Object.entries(stats?.categoryStats ?? {}).map(([cat, counts]) => (
                    <div key={cat}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="text-slate-500">{counts.completed}/{counts.total}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div 
                          className="h-full rounded-full bg-sky-500 transition-all" 
                          style={{ width: `${Math.round((counts.completed / counts.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(stats?.categoryStats ?? {}).length === 0 && (
                    <p className="text-xs italic text-slate-400">완료된 스킬이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:col-span-2">
              
              <div className="relative rounded-xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">학습 잔디</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">최근 13주간 완료한 날짜별 기록입니다.</p>
                
                <div className="mt-3 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
                  {heatmapDays.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} · ${day.count}건 완료`}
                      className={`h-3 w-3 shrink-0 rounded-sm ${heatmapCellClassName(day.count)}`}
                    />
                  ))}
                </div>
                {userId && isHeatmapLoading && <p className="mt-2 text-xs text-slate-500">불러오는 중...</p>}
                {userId && isHeatmapError && <p className="mt-2 text-xs text-red-500">데이터를 불러오지 못했습니다.</p>}
              </div>

              <div className="flex-1 rounded-xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
                <h2 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">최근 달성 스킬</h2>
                <div className="space-y-3">
                  {stats?.recentAchievements?.map((achievement, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{achievement.title}</p>
                        <p className="text-[10px] text-slate-500">{achievement.category} · {achievement.completedAt.slice(0,10)}</p>
                      </div>
                    </div>
                  ))}
                  {(!stats?.recentAchievements || stats.recentAchievements.length === 0) && (
                    <p className="text-xs italic text-slate-400">최근 달성한 스킬이 없습니다.</p>
                  )}
                </div>
              </div>
              
              <div className="flex-1 rounded-xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
                <h2 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">지금 지원 가능한 포지션</h2>
                <div className="space-y-4">
                  {realJobPostings.length > 0 ? (
                    realJobPostings.map((posting, idx) => (
                      <a
                        key={idx}
                        href={posting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-sky-700"
                      >
                        <div>
                          <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{posting.companyName}</p>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-300">
                            {posting.title}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
                          <span className="capitalize">{posting.site}</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                      <Briefcase className="mb-2 h-8 w-8 opacity-50" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">관련 공고가 없습니다.</p>
                      <p className="mt-1 text-xs text-slate-500">더 많은 스킬을 달성하여 매칭된 채용 공고를 확인해 보세요!</p>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>

          {!userId ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/65 p-6 backdrop-blur-md dark:bg-slate-950/65">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">로그인하면 전체 대시보드를 볼 수 있어요</p>
              {emailSent ? (
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">이메일로 로그인 링크를 보냈습니다!</p>
              ) : (
                <form onSubmit={handleLogin} className="mt-2 flex w-full max-w-xs flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
              )}
            </div>
          ) : null}
        </div>
      </div>

      {isGithubModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm transition-all dark:bg-black/60">
          <div className="w-full max-w-md scale-100 transform overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 text-left align-middle shadow-2xl backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/40">
            <h3 className="flex items-center gap-2 text-lg font-bold leading-6 text-slate-950 dark:text-white">
              <GitCommit className="h-5 w-5" />
              GitHub 커밋으로 자동 인증
            </h3>
            
            {!syncResult ? (
              <>
                <div className="mt-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    최근 작업하신 GitHub 레포지토리 URL을 입력해주세요. AI가 커밋 기록을 분석하여 현재 학습 중인 스킬을 자동으로 달성 처리해 줍니다. (Public 레포지토리만 지원)
                  </p>
                </div>
                <form onSubmit={handleGithubSync} className="mt-4 flex flex-col gap-3">
                  <input
                    type="url"
                    autoFocus
                    required
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-950 shadow-sm backdrop-blur-xl placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  />
                  <div className="mt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsGithubModalOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSyncing || !githubRepoUrl.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isSyncing ? (
                        "분석 중..."
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          AI 분석 및 인증
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="mt-4">
                {syncResult.length > 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <p className="font-bold mb-2">🎉 축하합니다! 다음 스킬이 인증되었습니다.</p>
                    <ul className="space-y-2 text-sm">
                      {syncResult.map((node, idx) => (
                        <li key={idx} className="flex flex-col gap-1">
                          <span className="font-bold underline underline-offset-2">{node.skillTitle}</span>
                          <span className="text-emerald-600/80 dark:text-emerald-400/80">{node.reason}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs">잠시 후 대시보드가 새로고침됩니다...</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <p className="font-bold mb-2">아쉽게도 매칭된 스킬이 없습니다.</p>
                    <p className="text-sm">현재 &apos;미달성&apos; 상태인 스킬과 레포지토리의 최근 커밋 기록 사이의 연관성을 찾지 못했습니다.</p>
                    <button
                      onClick={() => setSyncResult(null)}
                      className="mt-4 rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold transition hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20"
                    >
                      다시 시도
                    </button>
                  </div>
                )}
                {syncResult.length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => window.location.reload()}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-400"
                    >
                      확인
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
