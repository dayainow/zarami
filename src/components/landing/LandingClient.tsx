"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Target, TrendingUp, GitCommit, ChevronRight, ChevronDown, Play } from "lucide-react";

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
    id: "ts",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "ts",
      title: "TypeScript 기반 설계",
      category: "Frontend",
      status: "completed",
      certified_by_github: true,
    },
  },
  {
    id: "react",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "react",
      title: "React 코어 아키텍처",
      category: "Frontend",
      status: "completed",
      certified_by_github: true,
      isTrending: true,
    },
  },
  {
    id: "nextjs",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "nextjs",
      title: "Next.js App Router 도입",
      category: "Frontend",
      status: "available",
      isTrending: true,
      trendScore: "High",
    },
  },
  {
    id: "zustand",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "zustand",
      title: "Zustand 전역 상태관리",
      category: "Frontend",
      status: "available",
      isTrending: true,
    },
  },
  {
    id: "perf",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "perf",
      title: "웹 성능 및 렌더링 최적화",
      category: "Frontend",
      status: "locked",
    },
  },
  {
    id: "cicd",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "cicd",
      title: "GitHub Actions CI/CD",
      category: "DevOps",
      status: "locked",
    },
  },
];

const demoEdges: SkillTreeEdge[] = [
  { id: "e-goal-ts", source: "goal", target: "ts", type: "custom" },
  { id: "e-goal-react", source: "goal", target: "react", type: "custom" },
  { id: "e-ts-nextjs", source: "ts", target: "nextjs", type: "custom" },
  { id: "e-react-nextjs", source: "react", target: "nextjs", type: "custom", animated: true },
  { id: "e-react-zustand", source: "react", target: "zustand", type: "custom" },
  { id: "e-nextjs-perf", source: "nextjs", target: "perf", type: "custom", animated: true },
  { id: "e-nextjs-cicd", source: "nextjs", target: "cicd", type: "custom" },
];

const { nodes: initialLayoutedNodes, edges: initialLayoutedEdges } = getLayoutedElements(demoNodes, demoEdges, "LR");

export function LandingClient() {
  const router = useRouter();
  const { data: trends } = useSkillTrends();
  
  // Use pre-calculated layouted nodes for initial state so ReactFlow can fitView properly on mount
  const [layoutedNodes, setLayoutedNodes] = useState<SkillTreeNode[]>(initialLayoutedNodes);
  const [layoutedEdges, setLayoutedEdges] = useState<SkillTreeEdge[]>(initialLayoutedEdges);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  useEffect(() => {
    // Check if user is already logged in
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
      }
    });
  }, []);

  // (Removed layout calculation useEffect since it's done synchronously above)

  const handleStart = () => {
    router.push("/dashboard");
  };

  const topTrends = [...(trends || [])]
    .sort((a, b) => {
      const aTotal = (a.wanted_mentions || 0) + (a.jumpit_mentions || 0);
      const bTotal = (b.wanted_mentions || 0) + (b.jumpit_mentions || 0);
      return bTotal - aTotal;
    })
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200/50 bg-white/70 px-6 backdrop-blur-md dark:border-white/5 dark:bg-slate-950/70">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Image
              src="/images/brand/svg/zarami-logo-horizontal.svg"
              alt="Zarami"
              width={120}
              height={32}
              priority
              className="dark:brightness-200 dark:grayscale cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-500 transition-colors">기능 안내</a>
            <a href="#reviews" className="hover:text-emerald-500 transition-colors">성장 후기</a>
            <a href="#faq" className="hover:text-emerald-500 transition-colors">FAQ</a>
          </nav>
        </div>
        <button
          onClick={handleStart}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isLoggedIn ? "대시보드로 가기" : "무료로 시작하기"}
        </button>
      </header>

      {/* Hero & Interactive Demo Section */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between px-6 py-12 lg:py-24 max-w-7xl mx-auto w-full gap-12 flex-1">
        
        {/* Left: Copy & CTA */}
        <div className="lg:w-[60%] lg:pr-12 space-y-8 z-10 w-full text-center lg:text-left flex flex-col items-center lg:items-start">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-sky-500/20">
            <Sparkles className="h-3 w-3" />
            단 2주 만에 끝내는 실무형 스킬 퀘스트
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-snug text-slate-900 dark:text-white">
            실제 채용 시장이<br />
            만드는 당신의<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">커리어 로드맵</span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed font-medium">
            "뭘 더 배워야 실제 취업·이직에 쓰이나요?"<br />
            원티드·점핏·랠리·프로그래머스의 실채용공고 기반<br />
            <strong className="text-slate-900 dark:text-white">맞춤 퀘스트</strong>로 포트폴리오를 자동 완성합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-emerald-500/40 active:scale-95"
            >
              <Play className="h-5 w-5 fill-current" />
              {isLoggedIn ? "대시보드로 가기" : "무료로 내 스킬트리 만들기"}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/5">
            <span className="flex items-center gap-1"><span className="text-amber-400">⭐</span> 100+ 공고 분석</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1"><span className="text-blue-400">⏳</span> 평균 2주 완성</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><span className="text-emerald-500">💎</span> 지금 가입 시 평생 무료 플랜 유지</span>
          </div>
        </div>

        {/* Right: Interactive Canvas Demo */}
        <div className="lg:w-[40%] w-full h-[400px] lg:h-[550px] rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-sky-900/5 overflow-hidden flex flex-col relative group dark:border-white/10 dark:bg-slate-950 dark:shadow-none transition-transform hover:-translate-y-2 duration-500">
          
          {/* macOS Style Window Bar */}
          <div className="h-10 w-full bg-slate-50/80 border-b border-slate-200/80 flex items-center px-4 justify-between backdrop-blur-sm dark:bg-slate-900/80 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <div className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
              <Target className="h-3 w-3 text-rose-400" />
              이런 기술트리를 직접 만들 수 있어요
            </div>
            <div className="w-12" /> {/* Spacer for balance */}
          </div>

          <div className="flex-1 relative w-full h-full hidden md:block">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/5 via-transparent to-transparent pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
            <TechTreeCanvas
              nodes={layoutedNodes}
              edges={layoutedEdges}
              onNodesChange={() => {}}
              onEdgesChange={() => {}}
              interactive={true}
            />
          </div>
          
          <div className="flex-1 relative w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 md:hidden p-8 text-center border-t border-slate-100 dark:border-white/5">
            <Target className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">인터랙티브 데모는<br/>데스크톱에서 확인 가능합니다</p>
            <p className="text-xs text-slate-500 mt-2">PC 환경에서 자람이의 스킬트리를<br/>직접 체험해보세요.</p>
          </div>
        </div>
      </section>

      {/* Trend Preview Widget */}
      {topTrends.length > 0 && (
        <section className="w-full relative z-20 px-6 -mt-16 lg:-mt-24 mb-12 max-w-5xl mx-auto">
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-2xl shadow-sky-900/10 p-6 sm:p-8 dark:bg-slate-900/80 dark:border-white/10 flex flex-col md:flex-row items-center gap-6 md:gap-10 transition-transform hover:-translate-y-1 duration-500">
            <div className="flex-shrink-0 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 mb-3 shadow-sm shadow-rose-500/10">
                <TrendingUp className="h-4 w-4" />
                실시간 채용 트렌드
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                이번 주 <br className="hidden md:block"/>가장 수요 많은 스택
              </h3>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topTrends.map((trend, i) => {
                const total = (trend.wanted_mentions || 0) + (trend.jumpit_mentions || 0);
                return (
                  <div key={trend.id} className="relative bg-white dark:bg-slate-950/80 rounded-2xl p-5 border border-slate-100 dark:border-white/5 flex flex-col justify-center items-center sm:items-start overflow-hidden group shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5">
                    <div className="absolute -right-4 -bottom-6 opacity-[0.03] dark:opacity-[0.05] text-[100px] font-black italic select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">{i + 1}</div>
                    <div className="flex items-center gap-2 mb-1 z-10">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${i === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{trend.title}</span>
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-black mt-1 flex items-baseline gap-1 z-10">
                      <span className="text-2xl tracking-tight">{total.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 font-medium">건 요구됨</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Data Source Logo Band */}
      <section className="w-full border-t border-slate-200 bg-slate-50 py-12 dark:border-white/5 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="mb-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            실시간 채용 공고 데이터 수집 및 분석 기반
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-60 grayscale transition-all hover:grayscale-0 dark:opacity-40 dark:hover:opacity-100">
            {/* Wanted */}
            <div className="flex items-center gap-2">
              <img src="https://logo.clearbit.com/wanted.co.kr" alt="Wanted" className="h-6 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-2xl font-black tracking-tighter text-[#3366FF] flex items-center gap-1">
                <span className="w-6 h-6 rounded-full bg-[#3366FF] text-white flex items-center justify-center text-sm font-bold">w</span>anted
              </div>
            </div>
            {/* Jumpit */}
            <div className="flex items-center gap-2">
              <img src="https://logo.clearbit.com/jumpit.co.kr" alt="Jumpit" className="h-6 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-2xl font-black tracking-tighter text-[#00E58B]">jumpit</div>
            </div>
            {/* Programmers */}
            <div className="flex items-center gap-2">
              <img src="https://logo.clearbit.com/programmers.co.kr" alt="Programmers" className="h-6 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-xl font-bold tracking-tight text-[#000000] dark:text-white flex items-center gap-1">
                <span className="text-[#0078FF] font-black">P</span>rogrammers
              </div>
            </div>
            {/* RocketPunch */}
            <div className="flex items-center gap-2">
              <img src="https://logo.clearbit.com/rocketpunch.com" alt="RocketPunch" className="h-6 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-xl font-black tracking-tighter text-[#2188FB]">RocketPunch</div>
            </div>
            {/* GitHub */}
            <div className="flex items-center gap-2">
              <img src="https://logo.clearbit.com/github.com" alt="GitHub" className="h-6 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-xl font-bold text-slate-800 dark:text-white flex items-center gap-1">
                <GitCommit className="w-6 h-6"/> GitHub
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process Breakdown */}
      <section id="features" className="bg-gradient-to-b from-white to-slate-50 py-32 dark:from-slate-950 dark:to-slate-900/50 w-full border-t border-slate-200 dark:border-white/10 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              성장의 방향을 확신하는 3단계
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              어디서부터 해야 할지 모른다면, 실무 데이터가 이끄는 대로 따라오세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">1</div>
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/40 dark:text-indigo-400">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">진단 및 트렌드 분석</h3>
              <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">현재 기술 트리 진단</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                현재 채용 시장에서 가장 뜨겁게 요구되는 기술 트렌드를 시각화하여, 지금 당장 집중해야 할 학습 우선순위를 명확히 진단합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-rose-500/30">2</div>
              <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/40 dark:text-rose-400">
                <Target className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">맞춤형 퀘스트 생성</h3>
              <p className="font-semibold text-rose-600 dark:text-rose-400 mb-2">실전 미니 프로젝트</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                단순 튜토리얼이 아닙니다. 이력서에 작성 가능한 '트러블슈팅 경험'과 '아키텍처 설계' 중심의 2주짜리 실전 미니 프로젝트가 주어집니다.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30">3</div>
              <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-900/40 dark:text-amber-400">
                <GitCommit className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">GitHub 자산화</h3>
              <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2">포트폴리오 자동 완성</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                퀘스트를 해결한 PR 주소나 레포지토리를 연동하세요. AI가 커밋 내역을 분석하여 내 포트폴리오의 실질적인 자산으로 100% 인증합니다.
              </p>
            </div>
          </div>
          
          {/* Secondary CTA */}
          <div className="mt-20 text-center">
            <button
              onClick={handleStart}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-8 py-4 text-base font-bold text-white dark:text-slate-900 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              무료로 내 스킬트리 진단받기
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="bg-slate-50 py-32 dark:bg-slate-950/80 w-full border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              성장을 증명한 유저들의 이야기
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              자람이와 함께 실전 스펙을 쌓고 목표를 달성한 생생한 후기입니다.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border border-slate-100 shadow-lg shadow-slate-200/40 dark:bg-slate-900/50 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  "어디서부터 해야 할지 막막했는데, 네이버 공고 기반의 2주 스프린트 덕분에 <strong className="text-slate-900 dark:text-white">2주 만에 React 스킬트리를 완성</strong>하고 원티드를 통해 서류 합격했습니다."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e0e7ff" alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">김*현</div>
                  <div className="text-xs text-slate-500">주니어 프론트엔드 · 3주 만에 취업 성공</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border border-slate-100 shadow-lg shadow-slate-200/40 dark:bg-slate-900/50 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  "단순히 인강 듣는 걸 넘어서서, GitHub PR을 올려 인증받는 시스템이 최고예요. <strong className="text-slate-900 dark:text-white">3주 만에 4개의 실무형 퀘스트를 클리어</strong>하고 이력서가 꽉 찼습니다."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffe4e6" alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">이*진</div>
                  <div className="text-xs text-slate-500">취업 준비생 · 4개 퀘스트 자산화 완료</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border border-slate-100 shadow-lg shadow-slate-200/40 dark:bg-slate-900/50 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  "실시간 트렌드를 보면서 내가 부족했던 '상태관리 아키텍처' 부분을 정확히 짚어냈어요. 가이드대로 <strong className="text-slate-900 dark:text-white">PR 2개를 올리니 바로 잔디 뱃지</strong>를 받았습니다."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=d1fae5" alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">박*수</div>
                  <div className="text-xs text-slate-500">2년차 백엔드 · 트렌드 매칭 100% 달성</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-100 py-32 dark:bg-slate-900 w-full border-t border-slate-200 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-10 text-center">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-white/10 overflow-hidden transition-all">
              <button 
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-900 dark:text-white text-lg focus:outline-none"
                onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? -1 : 0)}
              >
                <span>나중에 유료화되나요?</span>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openFaqIndex === 0 ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-6 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed ${openFaqIndex === 0 ? 'block' : 'hidden'}`}>
                아닙니다! 현재 진행 중인 베타 서비스 기간 동안 가입하신 모든 회원님들께는 <strong className="text-slate-800 dark:text-slate-200">향후 유료 기능이 추가되더라도 평생 100% 무료 플랜</strong>을 약속드립니다. 지금 당장 부담 없이 시작해 보세요.
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-white/10 overflow-hidden transition-all">
              <button 
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-900 dark:text-white text-lg focus:outline-none"
                onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? -1 : 1)}
              >
                <span>어떤 직무를 지원하나요?</span>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openFaqIndex === 1 ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-6 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed ${openFaqIndex === 1 ? 'block' : 'hidden'}`}>
                초기 버전은 프론트엔드 및 백엔드 개발 직무의 기술 스택을 중심으로, 원티드 및 점핏 등 국내 유력 채용 플랫폼의 최신 채용 공고 데이터를 실시간으로 분석하여 맞춤 퀘스트를 제공합니다.
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-white/10 overflow-hidden transition-all">
              <button 
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-900 dark:text-white text-lg focus:outline-none"
                onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? -1 : 2)}
              >
                <span>GitHub 연동은 필수인가요?</span>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openFaqIndex === 2 ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-6 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed ${openFaqIndex === 2 ? 'block' : 'hidden'}`}>
                필수는 아닙니다. 하지만 연동 시 나의 학습 이력과 커밋이 자람이 프로필에 자동 인증되어, 더욱 강력한 포트폴리오 자산으로 활용할 수 있습니다. 퀘스트를 마치고 PR을 올리는 경험 자체가 실무의 기본이기도 합니다.
              </div>
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
            {isLoggedIn ? "대시보드로 이동하기" : "무료로 내 스킬트리 만들기"}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-950 py-16 border-t border-white/10 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <Image
                src="/images/brand/svg/zarami-logo-horizontal.svg"
                alt="Zarami"
                width={120}
                height={32}
                className="opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all"
              />
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-sm">
              실제 채용 공고 기반의 실무형 퀘스트로 당신의 커리어 로드맵을 완성하세요. 자람이는 여러분의 꾸준한 성장을 응원합니다.
            </p>
            <p className="text-xs">© 2026 Zarami. All rights reserved.</p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-4">서비스</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">기능 안내</a></li>
              <li><a href="#reviews" className="hover:text-white transition-colors">성장 후기</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">자주 묻는 질문</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-4">고객지원</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
              <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
              <li><a href="#" className="hover:text-white transition-colors">문의하기 (support@zarami.io)</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
