"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Target, TrendingUp, GitCommit, ChevronRight, Play } from "lucide-react";

import { TechTreeCanvas } from "@/components/skill-tree/TechTreeCanvas";
import { useSkillTrends } from "@/hooks/useSkillTrends";
import { createClient } from "@/utils/supabase/client";
import type { SkillTreeNode, SkillTreeEdge } from "@/types/skill-tree";
import { getLayoutedElements } from "@/lib/autoLayout";

const demoNodes: SkillTreeNode[] = [
  {
    id: "goal",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "goal",
      title: "프론트엔드 합격 퀘스트",
      category: "Goal",
      status: "completed",
    },
  },
  {
    id: "react",
    type: "skill",
    position: { x: 300, y: -100 },
    data: {
      id: "react",
      title: "React Hooks 심화",
      category: "Frontend",
      status: "completed",
      certified_by_github: true,
      isTrending: true,
    },
  },
  {
    id: "nextjs",
    type: "skill",
    position: { x: 300, y: 100 },
    data: {
      id: "nextjs",
      title: "Next.js App Router",
      category: "Frontend",
      status: "available",
      isTrending: true,
      trendScore: "High",
    },
  },
  {
    id: "zustand",
    type: "skill",
    position: { x: 600, y: -100 },
    data: {
      id: "zustand",
      title: "Zustand 상태관리",
      category: "Frontend",
      status: "locked",
    },
  },
];

const demoEdges: SkillTreeEdge[] = [
  { id: "e-goal-react", source: "goal", target: "react", type: "custom" },
  { id: "e-goal-nextjs", source: "goal", target: "nextjs", type: "custom", animated: true },
  { id: "e-react-zustand", source: "react", target: "zustand", type: "custom" },
];

export function LandingClient() {
  const router = useRouter();
  const { data: trends } = useSkillTrends();
  const [layoutedNodes, setLayoutedNodes] = useState<SkillTreeNode[]>(demoNodes);
  const [layoutedEdges, setLayoutedEdges] = useState<SkillTreeEdge[]>(demoEdges);

  useEffect(() => {
    // Check if user is already logged in
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  useEffect(() => {
    // Layout the demo nodes
    const { nodes: layoutedN, edges: layoutedE } = getLayoutedElements(demoNodes, demoEdges, "LR");
    setLayoutedNodes(layoutedN);
    setLayoutedEdges(layoutedE);
  }, []);

  const handleStart = () => {
    router.push("/dashboard");
  };

  const topTrends = trends?.slice(0, 3) || [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white flex flex-col">
      {/* Navbar Placeholder */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/70 bg-white/70 px-6 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950">
            🌱
          </span>
          Zarami
        </div>
        <button
          onClick={handleStart}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          로그인 / 시작하기
        </button>
      </header>

      {/* Hero & Interactive Demo Section */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between px-6 py-12 lg:py-24 max-w-7xl mx-auto w-full gap-12 flex-1">
        
        {/* Left: Copy & CTA */}
        <div className="flex-1 space-y-8 z-10 w-full">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            <Sparkles className="h-3 w-3" />
            단 2주 만에 끝내는 실무형 스킬 퀘스트
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            개인 기술트리를<br />
            직접 깎아 나가는<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">실전 커리어 가이드</span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed font-medium">
            어느 방향으로 성장해야 할지 막막하신가요?<br />
            원티드, 점핏의 실제 채용 공고 데이터를 기반으로<br />
            당신만을 위한 <strong className="text-slate-900 dark:text-white">맞춤형 미니 프로젝트 퀘스트</strong>를 제안합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-emerald-500/40"
            >
              <Play className="h-5 w-5 fill-current" />
              내 이력서로 나만의 로드맵 만들기
            </button>
          </div>
        </div>

        {/* Right: Interactive Canvas Demo */}
        <div className="flex-1 w-full h-[400px] lg:h-[500px] rounded-3xl border border-white/60 bg-white/40 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 overflow-hidden relative group">
          <div className="absolute inset-0 z-0 opacity-50 dark:opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-300/20 via-slate-50/0 to-transparent" />
          
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-800/80 dark:text-slate-200 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-rose-500" />
            인터랙티브 데모: 직접 움직여보세요!
          </div>

          <div className="h-full w-full">
            <TechTreeCanvas
              nodes={layoutedNodes}
              edges={layoutedEdges}
              onNodesChange={() => {}}
              onEdgesChange={() => {}}
              interactive={true}
            />
          </div>
        </div>
      </section>

      {/* Feature / Trends Preview Section */}
      <section className="bg-white py-24 dark:bg-slate-950 w-full border-t border-slate-200 dark:border-white/10 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              성장을 증명하고, 트렌드를 앞서가세요
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              100건 이상의 실제 채용 공고를 분석하여 가장 시장 수요가 높은 기술을 우선적으로 추천합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 transition-transform hover:-translate-y-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/40 dark:text-indigo-400">
                <GitCommit className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">GitHub 자동 인증</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                해결한 퀘스트의 PR 주소나 레포지토리를 연동하세요. AI가 커밋 내역을 분석하여 내 포트폴리오의 실질적인 자산으로 자동 인증해 드립니다.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 transition-transform hover:-translate-y-2">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/40 dark:text-rose-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">실시간 트렌드 분석</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                현재 채용 시장에서 가장 뜨겁게 요구되는 기술 트렌드를 시각화하여, 지금 당장 집중해야 할 학습 우선순위를 명확히 제시합니다.
              </p>
              
              {/* Mini Trend Preview */}
              <div className="mt-4 flex flex-col gap-2">
                {topTrends.length > 0 ? (
                  topTrends.map((trend, i) => (
                    <div key={trend.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="text-xs text-rose-500">{i+1}</span>
                        {trend.title}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full dark:bg-rose-900/30 dark:text-rose-400">
                        급상승 🔥
                      </span>
                    </div>
                  ))
                ) : (
                   <div className="text-center text-sm text-slate-500 py-4">트렌드 데이터를 불러오는 중...</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 transition-transform hover:-translate-y-2">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-900/40 dark:text-amber-400">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">실전 2주 스프린트</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                문법 위주의 튜토리얼이 아닙니다. 실제 이력서에 작성 가능한 '트러블슈팅 경험'과 '아키텍처 설계' 중심의 실전 퀘스트가 제공됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-slate-950 py-24 text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            이제 성장의 방향을 확신하세요
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            무료로 가입하고 1분 만에 나만의 커리어 로드맵을 설계해 보세요.
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-slate-900 shadow-xl transition-all hover:scale-105 hover:bg-slate-100"
          >
            대시보드로 이동하기
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>
    </main>
  );
}
