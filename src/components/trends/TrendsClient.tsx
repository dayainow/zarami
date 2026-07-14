"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ExternalLink, ChevronDown, ChevronUp, Briefcase, Sparkles, Flame, Target, Lightbulb, BarChart3, BookOpen, Search, CheckCircle2, Circle } from "lucide-react";
import { useSkillTrends, type SkillTrend } from "@/hooks/useSkillTrends";
import { useProfileStats } from "@/hooks/useProfileStats";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export function TrendsClient() {
  const { data: trends, isLoading, isError } = useSkillTrends();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchKeyword, setSearchKeyword] = useState(searchParams.get("q") ?? "");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACQUIRED" | "NEEDED">((searchParams.get("status") as "ALL" | "ACQUIRED" | "NEEDED") ?? "ALL");
  const [sortBy, setSortBy] = useState<"TREND" | "FIT" | "GAP">((searchParams.get("sort") as "TREND" | "FIT" | "GAP") ?? "TREND");

  const [isPending, startTransition] = useTransition();

  const [segmentPosition, setSegmentPosition] = useState<string>(searchParams.get("position") ?? "ALL");
  const [segmentExperience, setSegmentExperience] = useState<string>(searchParams.get("years") ?? "ALL");
  const [segmentCompanyType, setSegmentCompanyType] = useState<string>(searchParams.get("companyType") ?? "ALL");

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchKeyword) params.set("q", searchKeyword);
    else params.delete("q");
    
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    else params.delete("status");
    
    if (sortBy !== "TREND") params.set("sort", sortBy);
    else params.delete("sort");
    
    if (segmentPosition !== "ALL") params.set("position", segmentPosition);
    else params.delete("position");
    
    if (segmentExperience !== "ALL") params.set("years", segmentExperience);
    else params.delete("years");
    
    if (segmentCompanyType !== "ALL") params.set("companyType", segmentCompanyType);
    else params.delete("companyType");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchKeyword, filterStatus, sortBy, segmentPosition, segmentExperience, segmentCompanyType, pathname, router, searchParams]);

  const getMentionsForTrend = useCallback((trend: SkillTrend) => {
    if (segmentPosition === "ALL" && segmentExperience === "ALL" && segmentCompanyType === "ALL") {
      return (trend.wanted_mentions || 0) + (trend.jumpit_mentions || 0);
    }
    
    if (!trend.segment_stats) return 0;
    
    const posCount = segmentPosition !== "ALL" ? (trend.segment_stats.position?.[segmentPosition] || 0) : null;
    const expCount = segmentExperience !== "ALL" ? (trend.segment_stats.experience?.[segmentExperience] || 0) : null;
    const compCount = segmentCompanyType !== "ALL" ? (trend.segment_stats.company_type?.[segmentCompanyType] || 0) : null;

    const activeCounts = [posCount, expCount, compCount].filter(c => c !== null) as number[];
    if (activeCounts.length === 0) return 0;
    
    return Math.min(...activeCounts);
  }, [segmentPosition, segmentExperience, segmentCompanyType]);

  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user ? data.user.id : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: stats } = useProfileStats(userId);

  const insights = useMemo(() => {
    if (!trends || trends.length === 0) return null;
    
    const trendsWithMentions = trends.map(t => ({ ...t, current_mentions: getMentionsForTrend(t) }));
    
    const sortedByMentions = [...trendsWithMentions].sort((a, b) => b.current_mentions - a.current_mentions);
    const topRising = sortedByMentions[0];

    let bestFit = null;
    let missedOpportunity = null;

    if (stats && stats.allSkillTitles && stats.allSkillTitles.length > 0) {
      const neededSkills = stats.allSkillTitles.filter(title => !stats.completedSkills.includes(title));
      const neededTrends = trendsWithMentions.filter(t => neededSkills.includes(t.title) && t.current_mentions > 0);
      neededTrends.sort((a, b) => b.current_mentions - a.current_mentions);
      if (neededTrends.length > 0) bestFit = neededTrends[0];

      const missedTrends = trendsWithMentions.filter(t => t.trend_score === "High" && !stats.allSkillTitles.includes(t.title) && t.current_mentions > 0);
      missedTrends.sort((a, b) => b.current_mentions - a.current_mentions);
      if (missedTrends.length > 0) missedOpportunity = missedTrends[0];
    } else {
       bestFit = sortedByMentions[1];
       missedOpportunity = sortedByMentions[2];
    }

    return { topRising, bestFit, missedOpportunity };
  }, [trends, stats, getMentionsForTrend]);

  const sortedAndFilteredTrends = useMemo(() => {
    if (!trends) return [];
    
    const trendsWithMentions = trends.map(t => ({ ...t, current_mentions: getMentionsForTrend(t) }));
    
    // 세그먼트 필터를 켰는데 멘션이 0건이면 필터링 (ALL일 땐 0건도 노출)
    let filtered = trendsWithMentions.filter(t => 
      (segmentPosition === "ALL" && segmentExperience === "ALL" && segmentCompanyType === "ALL") 
      ? true 
      : t.current_mentions > 0
    );
    
    if (searchKeyword.trim() !== "") {
      filtered = filtered.filter(trend => 
        trend.title.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    if (stats && filterStatus !== "ALL") {
      filtered = filtered.filter(trend => {
        const isAcquired = stats.completedSkills.includes(trend.title);
        if (filterStatus === "ACQUIRED") return isAcquired;
        if (filterStatus === "NEEDED") return !isAcquired && stats.allSkillTitles.includes(trend.title);
        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "TREND") {
        return b.current_mentions - a.current_mentions;
      } else if (sortBy === "FIT" && stats) {
        // 정렬 기준: 로드맵에 있지만 안 배운 것(우선순위 1) > 이미 배운 것(우선순위 2) > 로드맵에 없는 것(우선순위 3)
        const getFitScore = (title: string) => {
          const inRoadmap = stats.allSkillTitles.includes(title);
          const isCompleted = stats.completedSkills.includes(title);
          if (inRoadmap && !isCompleted) return 3;
          if (inRoadmap && isCompleted) return 2;
          return 1;
        };
        const scoreDiff = getFitScore(b.title) - getFitScore(a.title);
        if (scoreDiff !== 0) return scoreDiff;
        return b.current_mentions - a.current_mentions; // 같으면 멘션순
      }
      return b.current_mentions - a.current_mentions;
    });
  }, [trends, searchKeyword, filterStatus, sortBy, stats, getMentionsForTrend, segmentPosition, segmentExperience, segmentCompanyType]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-4xl space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Skill Market</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">채용 트렌드</h1>
          </header>
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-500">데이터를 불러오는 중입니다...</p>
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-4xl space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Skill Market</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">채용 트렌드</h1>
          </header>
          <div className="flex items-center justify-center py-20">
            <p className="text-red-500">데이터를 불러오는 데 실패했습니다.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Skill Market
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-200">실시간 채용 트렌드 분석</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            원티드, 점핏 등 100건 이상의 최신 프론트엔드/백엔드 채용 공고(JD)를 실시간으로 수집하여 분석한 데이터입니다. 시장의 실제 수요와 내 로드맵의 갭(Gap)을 파악하고 다음 학습의 우선순위를 결정해 보세요.
          </p>
        </header>

        {insights && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border border-white/70 bg-gradient-to-br from-white/80 to-slate-50/50 p-5 shadow-lg shadow-rose-900/5 backdrop-blur-2xl transition dark:border-white/10 dark:from-slate-900/60 dark:to-slate-900/20">
              <div className="flex items-center gap-2 text-rose-500">
                <Flame className="h-5 w-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">이번 주 급상승</h3>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{insights.topRising?.title}</p>
              <p className="text-[11px] text-slate-500">
                시장에서 가장 뜨겁게 요구되는 기술입니다.<br/>
                <span className="font-semibold text-rose-600 dark:text-rose-400">최근 공고 내 수요 {insights.topRising?.current_mentions ?? 0}건</span>
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-white/70 bg-gradient-to-br from-white/80 to-slate-50/50 p-5 shadow-lg shadow-sky-900/5 backdrop-blur-2xl transition dark:border-white/10 dark:from-slate-900/60 dark:to-slate-900/20">
              <div className="flex items-center gap-2 text-sky-500">
                <Target className="h-5 w-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">{stats ? "나에게 가장 적합" : "꾸준한 스테디셀러"}</h3>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{insights.bestFit?.title ?? "-"}</p>
              <p className="text-[11px] text-slate-500">
                {stats ? "내 로드맵에 있지만 아직 안 배운 핵심 기술입니다." : "시장 수요가 안정적이고 탄탄한 기술입니다."}<br/>
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {stats ? `내 로드맵 미완료 중 수요 1위 (${insights.bestFit?.current_mentions ?? 0}건)` : `수요 안정권 (${insights.bestFit?.current_mentions ?? 0}건)`}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-white/70 bg-gradient-to-br from-white/80 to-slate-50/50 p-5 shadow-lg shadow-amber-900/5 backdrop-blur-2xl transition dark:border-white/10 dark:from-slate-900/60 dark:to-slate-900/20">
              <div className="flex items-center gap-2 text-amber-500">
                <Lightbulb className="h-5 w-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">놓치고 있는 기회</h3>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{insights.missedOpportunity?.title ?? "-"}</p>
              <p className="text-[11px] text-slate-500">
                {stats ? "내 로드맵에는 없지만 시장 수요가 매우 높습니다." : "배워두면 취업/이직에 강력한 무기가 됩니다."}<br/>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {stats ? `내 로드맵 미포함 스킬 중 수요 TOP (${insights.missedOpportunity?.current_mentions ?? 0}건)` : `틈새 수요 TOP (${insights.missedOpportunity?.current_mentions ?? 0}건)`}
                </span>
              </p>
            </div>
          </section>
        )}

        <section className="space-y-4">
          {/* 세그먼트 필터 바 */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="mr-2 rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">Target</span>
            </div>
            
            <select
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none hover:border-indigo-300 hover:bg-indigo-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
              value={segmentPosition}
              onChange={(e) => startTransition(() => setSegmentPosition(e.target.value))}
            >
              <option value="ALL">모든 포지션</option>
              <option value="frontend">프론트엔드</option>
              <option value="backend">백엔드</option>
              <option value="fullstack">풀스택</option>
              <option value="mobile">모바일</option>
              <option value="data">데이터</option>
              <option value="ai">AI</option>
            </select>

            <select
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none hover:border-emerald-300 hover:bg-emerald-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
              value={segmentExperience}
              onChange={(e) => startTransition(() => setSegmentExperience(e.target.value))}
            >
              <option value="ALL">모든 연차</option>
              <option value="junior">신입~3년 (주니어)</option>
              <option value="mid">4~7년 (미들)</option>
              <option value="senior">8년 이상 (시니어)</option>
            </select>

            <select
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none hover:border-amber-300 hover:bg-amber-50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
              value={segmentCompanyType}
              onChange={(e) => startTransition(() => setSegmentCompanyType(e.target.value))}
            >
              <option value="ALL">모든 회사유형</option>
              <option value="startup">스타트업</option>
              <option value="enterprise">대기업/중견</option>
              <option value="agency">SI/에이전시</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="스킬 키워드 검색 (예: React)"
                value={searchKeyword}
                onChange={(e) => startTransition(() => setSearchKeyword(e.target.value))}
                className="w-full bg-transparent py-1.5 pl-10 pr-4 text-sm text-slate-950 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />
            </div>
            
            <div className="h-px w-full bg-slate-200 dark:bg-white/10 md:h-6 md:w-px" />

            <div className="flex items-center gap-2 px-1">
              <select
                className="cursor-pointer appearance-none bg-transparent py-1.5 pl-2 pr-6 text-sm font-semibold text-slate-700 outline-none hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                value={filterStatus}
                onChange={(e) => startTransition(() => setFilterStatus(e.target.value as "ALL" | "ACQUIRED" | "NEEDED"))}
              >
                <option value="ALL">상태: 전체 보기</option>
                {userId && <option value="ACQUIRED">상태: 이미 학습함</option>}
                {userId && <option value="NEEDED">상태: 내 로드맵(미학습)</option>}
              </select>
              
              <div className="h-4 w-px bg-slate-300 dark:bg-white/20" />

              <select
                className="cursor-pointer appearance-none bg-transparent py-1.5 pl-2 pr-6 text-sm font-semibold text-slate-700 outline-none hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                value={sortBy}
                onChange={(e) => startTransition(() => setSortBy(e.target.value as "TREND" | "FIT" | "GAP"))}
              >
                <option value="TREND">정렬: 시장 수요순</option>
                {userId && <option value="FIT">정렬: 내 적합도순</option>}
              </select>
            </div>
          </div>
          
          {/* Loading Indicator for Filter */}
          {isPending && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>데이터 분석 중...</span>
            </div>
          )}

          {sortedAndFilteredTrends.length === 0 ? (
             <div className="rounded-2xl border border-white/70 bg-white/70 p-8 text-center shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
               <p className="text-slate-500">분석된 채용 데이터가 없거나 필터 조건에 맞는 스킬이 없습니다.</p>
             </div>
          ) : (
            sortedAndFilteredTrends.map((trend: SkillTrend & { current_mentions?: number }, idx) => {
              const isExpanded = expandedId === trend.id;
              const totalMentions = trend.current_mentions ?? 0;
              
              const isInRoadmap = stats?.allSkillTitles.includes(trend.title);
              const isCompleted = stats?.completedSkills.includes(trend.title);

              return (
                <div key={trend.id} className={`overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-white/[0.04] ${isPending ? 'opacity-50 grayscale-[50%]' : 'opacity-100'}`}>
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 sm:flex dark:bg-slate-800 dark:text-slate-400">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-950 dark:text-white">{trend.title}</h2>
                          {isCompleted ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> 보유함
                            </span>
                          ) : isInRoadmap ? (
                            <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              <Circle className="h-3 w-3" /> 내 로드맵
                            </span>
                          ) : null}
                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {totalMentions}건 요구
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">
                            {trend.trend_score === "High" ? "🔥 수요 매우 높음" : trend.trend_score === "Medium" ? "⭐️ 수요 보통" : "니치 마켓"}
                          </span>
                          {(segmentPosition !== "ALL" || segmentExperience !== "ALL" || segmentCompanyType !== "ALL") && (
                            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                              선택한 세그먼트
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                      <a 
                        href={`/manage-tree?addTrendSkill=${encodeURIComponent(trend.title)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        + 로드맵에 추가
                      </a>
                      
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : trend.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? "닫기" : "상세 보기"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-black/20">
                      
                      {/* Context & Action Section */}
                      <div className="mb-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            실무 활용 맥락
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {trend.title} 기술은 현재 채용 시장에서 주로 <strong>설계, 최적화, 유지보수</strong> 문맥과 함께 등장합니다. 단순히 사용법을 아는 것을 넘어, 프로젝트에 도입한 이유와 문제 해결 과정을 이력서에 작성하면 매력도가 크게 상승합니다.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">#실무도입_필수</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">#성능개선</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                            증명 가능한 액션 가이드
                          </h3>
                          <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <li>간단한 토이 프로젝트보다는 <strong>기존 코드 리팩토링</strong> 적용 추천</li>
                            <li>이 기술을 사용하지 않았을 때와의 <strong>성능/코드량 비교</strong> 정리</li>
                            <li>GitHub README에 아키텍처 고민 흔적 남기기</li>
                          </ul>
                        </div>
                      </div>

                      {/* Job Postings */}
                      {trend.sample_postings && trend.sample_postings.length > 0 ? (
                        <>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <Briefcase className="h-4 w-4" />
                            최근 실제 지원 가능한 포지션 ({trend.sample_postings.length}건)
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {trend.sample_postings.slice(0, 6).map((posting, pIdx) => (
                              <a
                                key={pIdx}
                                href={posting.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-sky-700"
                              >
                                <div>
                                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{posting.companyName}</p>
                                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-300">
                                    {posting.title}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
                                  <span className="capitalize">{posting.site}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                           <p className="text-sm text-slate-500">샘플 채용 공고 데이터가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
