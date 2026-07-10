"use client";

import { useMemo, useState } from "react";
import { ExternalLink, TrendingUp, ChevronDown, ChevronUp, Briefcase, Sparkles } from "lucide-react";
import { useSkillTrends } from "@/hooks/useSkillTrends";

export function TrendsClient() {
  const { data: trends, isLoading, isError } = useSkillTrends();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");

  const sortedTrends = useMemo(() => {
    if (!trends) return [];
    
    let filtered = trends;
    if (searchKeyword.trim() !== "") {
      filtered = filtered.filter(trend => 
        trend.title.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    return [...filtered].sort((a, b) => {
      const aMentions = (a.wanted_mentions || 0) + (a.jumpit_mentions || 0);
      const bMentions = (b.wanted_mentions || 0) + (b.jumpit_mentions || 0);
      return bMentions - aMentions;
    });
  }, [trends, searchKeyword]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-4xl space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Skill Market
            </p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Skill Market
            </p>
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
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">채용 트렌드 분석</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            실제 채용 플랫폼(원티드, 점핏)의 데이터를 분석하여 수요가 가장 높은 스킬을 보여줍니다. 다음 테크트리를 계획할 때 참고해 보세요.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
            <input
              type="text"
              placeholder="스킬 키워드 검색 (예: React, Node.js)"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-950 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {sortedTrends.length === 0 ? (
             <div className="rounded-2xl border border-white/70 bg-white/70 p-8 text-center shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
               <p className="text-slate-500">분석된 채용 데이터가 없습니다. (trends 길이: {trends?.length ?? 'undefined'})</p>
             </div>
          ) : (
            sortedTrends.map((trend, idx) => {
              const isExpanded = expandedId === trend.id;
              const totalMentions = (trend.wanted_mentions || 0) + (trend.jumpit_mentions || 0);
              const rank = idx + 1;

              return (
                <div key={trend.id} className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-white/[0.04]">
                  <div 
                    className="flex cursor-pointer items-center justify-between gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    onClick={() => setExpandedId(isExpanded ? null : trend.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${rank <= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {rank}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{trend.title}</h2>
                        <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-3.5 w-3.5" />
                            공고 {totalMentions}건 포함
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {trend.trend_score === "High" ? "수요 높음 🔥" : trend.trend_score === "Medium" ? "수요 보통" : "수요 적음"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="rounded-full bg-slate-200/50 px-2 py-0.5 dark:bg-slate-800">원티드: {trend.wanted_mentions || 0}</span>
                        <span className="rounded-full bg-slate-200/50 px-2 py-0.5 dark:bg-slate-800">점핏: {trend.jumpit_mentions || 0}</span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-black/20">
                      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/10">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            이 스펙으로 로드맵을 설계해볼까요?
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {trend.title} 기반의 학습 로드맵을 AI가 즉시 생성해 드립니다.
                          </p>
                        </div>
                        <a 
                          href={`/manage-tree?generateSkill=${encodeURIComponent(trend.title)}`}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                        >
                          <Sparkles className="h-4 w-4" />
                          로드맵 자동 생성 ⚡️
                        </a>
                      </div>

                      {trend.sample_postings && trend.sample_postings.length > 0 ? (
                        <>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <Briefcase className="h-4 w-4" />
                            실제 지원 가능한 공고 ({trend.sample_postings.length}건)
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {trend.sample_postings.map((posting, pIdx) => (
                              <a
                                key={pIdx}
                                href={posting.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-sky-700"
                              >
                                <div>
                                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{posting.companyName}</p>
                                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-300">
                                    {posting.title}
                                  </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
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
