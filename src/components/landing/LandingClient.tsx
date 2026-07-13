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
          {isLoggedIn ? "대시보드로 가기" : "로그인 / 시작하기"}
        </button>
      </header>

      {/* Hero & Interactive Demo Section */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between px-6 py-12 lg:py-24 max-w-7xl mx-auto w-full gap-12 flex-1">
        
        {/* Left: Copy & CTA */}
        <div className="lg:w-[60%] lg:pr-12 space-y-8 z-10 w-full">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-sky-500/20">
            <Sparkles className="h-3 w-3" />
            단 2주 만에 끝내는 실무형 스킬 퀘스트
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-snug text-slate-900 dark:text-white">
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
              {isLoggedIn ? "대시보드로 가기" : "무료로 내 스킬트리 만들기"}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="text-amber-400">⭐</span> 100+ 채용공고 실시간 분석</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1"><span className="text-blue-400">⏳</span> 평균 2주 퀘스트 완료</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400">💰</span> 100% 무료 시작</span>
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
            <div className="text-[11px] font-bold tracking-wider text-slate-400 flex items-center gap-1 uppercase">
              <Target className="h-3 w-3 text-rose-400" />
              Live Interactive Demo
            </div>
            <div className="w-12" /> {/* Spacer for balance */}
          </div>

          <div className="flex-1 relative w-full h-full">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/5 via-transparent to-transparent pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
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

      {/* Data Source Logo Band */}
      <section className="w-full border-t border-slate-200 bg-white py-12 dark:border-white/5 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="mb-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            실시간 채용 공고 데이터 수집 및 분석 기반
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale transition-all hover:grayscale-0 dark:opacity-40 dark:hover:opacity-100">
            <div className="text-2xl font-black tracking-tighter text-[#3366FF]">wanted</div>
            <div className="text-2xl font-black tracking-tighter text-[#00E58B]">jumpit</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-1">
              <GitCommit className="w-6 h-6"/> GitHub
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process Breakdown */}
      <section className="bg-slate-50 py-32 dark:bg-slate-900 w-full border-t border-slate-200 dark:border-white/10 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              성장의 방향을 확신하는 3단계
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              어디서부터 해야 할지 모른다면, 실무 데이터가 이끄는 대로 따라오세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-950/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">1</div>
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/40 dark:text-indigo-400">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">진단 및 트렌드 분석</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                현재 채용 시장에서 가장 뜨겁게 요구되는 기술 트렌드를 시각화하여, 지금 당장 집중해야 할 학습 우선순위를 명확히 진단합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-950/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-rose-500/30">2</div>
              <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/40 dark:text-rose-400">
                <Target className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">맞춤형 퀘스트 생성</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                단순 튜토리얼이 아닙니다. 이력서에 작성 가능한 '트러블슈팅 경험'과 '아키텍처 설계' 중심의 2주짜리 실전 미니 프로젝트가 주어집니다.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-950/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30">3</div>
              <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-900/40 dark:text-amber-400">
                <GitCommit className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">GitHub 자산화</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                퀘스트를 해결한 PR 주소나 레포지토리를 연동하세요. AI가 커밋 내역을 분석하여 내 포트폴리오의 실질적인 자산으로 100% 인증합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-32 dark:bg-slate-950 w-full border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              성장을 경험한 유저들의 이야기
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/40 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">"어디서부터 해야 할지 막막했는데, 네이버 공고 기반의 2주 스프린트 덕에 당장 해야 할 명확한 목표를 잡았습니다."</p>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">K</div>
                <div>
                  <div className="block">주니어 프론트엔드</div>
                  <div className="text-xs text-slate-500 font-normal">사용 3주차</div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/40 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">"단순히 인강 듣는 걸 넘어서서, GitHub PR을 올려 인증받는 시스템이라서 제 이력서에 실제로 쓸 스토리가 쌓여요!"</p>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">L</div>
                <div>
                  <div className="block">취업 준비생</div>
                  <div className="text-xs text-slate-500 font-normal">2개 퀘스트 완료</div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-8 border border-slate-100 dark:bg-slate-900/40 dark:border-white/5 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex text-amber-400 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">"실시간 트렌드 보면서 내가 부족했던 '상태관리 아키텍처' 부분을 정확히 짚어냈습니다. 바로 다음 목표로 설정했어요."</p>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">P</div>
                <div>
                  <div className="block">2년차 프론트엔드</div>
                  <div className="text-xs text-slate-500 font-normal">사용 1개월차</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-32 dark:bg-slate-900/50 w-full border-t border-slate-200 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-10 text-center">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-white/5 transition-transform hover:-translate-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">정말 전면 무료인가요?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">네! 현재 베타 서비스 기간 동안 채용 공고 기반의 스킬 트리 생성과 GitHub 자동 인증 연동 기능을 100% 무료로 제공하고 있습니다.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-white/5 transition-transform hover:-translate-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">어떤 직무를 지원하나요?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">초기 버전은 프론트엔드 및 백엔드 개발 직무의 기술 스택을 중심으로, 원티드 및 점핏 등 국내 유력 채용 플랫폼의 데이터를 수집해 제공합니다.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-white/5 transition-transform hover:-translate-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">GitHub 연동은 필수인가요?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">필수는 아닙니다. 하지만 연동 시 나의 학습 이력과 커밋이 자람이 프로필에 자동 인증되어, 더욱 강력한 포트폴리오 자산으로 활용할 수 있습니다.</p>
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
      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-white/10 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2 font-bold text-lg mb-4 text-white">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500 text-white text-sm">
            🌱
          </span>
          Zarami
        </div>
        <p className="text-sm">© 2026 Zarami. All rights reserved. | 실전 지향형 커리어 가이드</p>
      </footer>
    </main>
  );
}
