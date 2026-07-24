"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Target, TrendingUp, GitCommit, ChevronRight, ChevronDown, Play, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactFlowInstance } from "@xyflow/react";

const TechTreeCanvas = dynamic(
  () => import("@/components/skill-tree/TechTreeCanvas").then((mod) => mod.TechTreeCanvas),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 dark:bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-xs font-semibold">캔버스 불러오는 중...</span>
      </div>
    )
  }
);

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSkillTrends } from "@/hooks/useSkillTrends";
import { createClient } from "@/utils/supabase/client";
import type { SkillTreeNode, SkillTreeEdge } from "@/types/skill-tree";
import { getLayoutedElements } from "@/lib/autoLayout";

// 가장 대표적인 풀스택 로드맵: 웹 기초(맨 아래)에서 서비스 런칭(꼭대기)까지
// 수직으로 타고 올라가는 트리. 완료/진행중/추천/잠김 상태를 모두 보여준다.
const demoNodes: SkillTreeNode[] = [
  {
    id: "base",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "base",
      title: "웹 기초 (HTML·CSS·JS)",
      description: "모든 개발의 출발점",
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
      title: "React & TypeScript",
      description: "컴포넌트 설계와 타입 안전성",
      category: "Frontend",
      status: "completed",
      certified_by_github: true,
      isTrending: true,
    },
  },
  {
    id: "node",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "node",
      title: "Node.js & Express API",
      description: "REST API 서버 구축",
      category: "Backend",
      status: "completed",
    },
  },
  {
    id: "next",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "next",
      title: "Next.js App Router",
      description: "SSR과 풀스택 프레임워크",
      category: "Frontend",
      status: "in-progress",
      isTrending: true,
      trendScore: "High",
    },
  },
  {
    id: "db",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "db",
      title: "PostgreSQL & Prisma",
      description: "데이터 모델링과 ORM",
      category: "Backend",
      status: "available",
      isNextAction: true,
      isTrending: true,
    },
  },
  {
    id: "deploy",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "deploy",
      title: "Docker & AWS 배포",
      description: "컨테이너와 클라우드 인프라",
      category: "DevOps",
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
      description: "자동 빌드·테스트·배포",
      category: "DevOps",
      status: "locked",
    },
  },
  {
    id: "goal",
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      id: "goal",
      title: "풀스택 서비스 런칭 🚀",
      description: "포트폴리오가 되는 실서비스",
      category: "Goal",
      status: "locked",
    },
  },
];

// source = 선행 스킬(아래), target = 다음 스킬(위) — 화살표가 위로 향한다
const demoEdges: SkillTreeEdge[] = [
  { id: "e-base-react", source: "base", target: "react", type: "smoothstep" },
  { id: "e-base-node", source: "base", target: "node", type: "smoothstep" },
  { id: "e-react-next", source: "react", target: "next", type: "smoothstep", animated: true },
  { id: "e-node-db", source: "node", target: "db", type: "smoothstep", animated: true },
  { id: "e-next-deploy", source: "next", target: "deploy", type: "smoothstep" },
  { id: "e-db-deploy", source: "db", target: "deploy", type: "smoothstep" },
  { id: "e-db-cicd", source: "db", target: "cicd", type: "smoothstep" },
  { id: "e-deploy-goal", source: "deploy", target: "goal", type: "smoothstep", animated: true },
  { id: "e-cicd-goal", source: "cicd", target: "goal", type: "smoothstep" },
];

// BT: 아래(기초)에서 위(목표)로 자라는 세로 트리 — 앱 본편의 성장 캔버스와 같은 방향
const { nodes: initialLayoutedNodes, edges: initialLayoutedEdges } = getLayoutedElements(demoNodes, demoEdges, "BT");

export function LandingClient() {
  const router = useRouter();
  const { data: trends } = useSkillTrends();
  
  // Use pre-calculated layouted nodes for initial state so ReactFlow can fitView properly on mount
  const [layoutedNodes] = useState<SkillTreeNode[]>(initialLayoutedNodes);
  const [layoutedEdges] = useState<SkillTreeEdge[]>(initialLayoutedEdges);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  // 데모 카메라 연출: 트리 시작점(웹 기초)에 포커스했다가
  // 전체 세로 트리가 드러나도록 천천히 줌아웃한다.
  const demoZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (demoZoomTimer.current) clearTimeout(demoZoomTimer.current);
  }, []);
  const handleDemoInit = useCallback((instance: ReactFlowInstance<SkillTreeNode, SkillTreeEdge>) => {
    void instance.fitView({
      nodes: [{ id: "base" }, { id: "react" }, { id: "node" }],
      padding: 0.2,
      maxZoom: 0.9,
    });
    demoZoomTimer.current = setTimeout(() => {
      void instance.fitView({ padding: 0.1, maxZoom: 1.2, duration: 1600 });
    }, 1200);
  }, []);

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
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const handleTry = () => {
    router.push("/try");
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
              className="h-auto dark:brightness-200 dark:grayscale cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-500 transition-colors">기능 안내</a>
            <a href="#reviews" className="hover:text-emerald-500 transition-colors">성장 후기</a>
            <a href="#faq" className="hover:text-emerald-500 transition-colors">FAQ</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden md:flex" />
          {!isLoggedIn && (
            <button
              onClick={handleTry}
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              체험해보기
            </button>
          )}
          <button
            onClick={handleStart}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isLoggedIn ? "대시보드로 가기" : "무료로 시작하기"}
          </button>
        </div>
      </header>

      {/* Hero & Interactive Demo Section */}
      <section className="relative flex flex-col items-center px-6 pt-16 pb-8 lg:pt-24 lg:pb-12 max-w-7xl mx-auto w-full gap-12 md:gap-16 flex-1">
        
        {/* Top: Copy & CTA */}
        <div className="w-full max-w-4xl space-y-8 z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-sky-500/20">
            <Sparkles className="h-3 w-3" />
            단 2주 만에 끝내는 실무형 스킬 퀘스트
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-snug text-slate-900 dark:text-white">
            실제 채용 시장이 만드는 당신의<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500 mt-2 inline-block">커리어 로드맵</span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-medium">
            &quot;뭘 더 배워야 실제 취업·이직에 쓰이나요?&quot;<br />
            원티드·점핏·랠리·프로그래머스의 실채용공고 기반<br className="sm:hidden" />
            <strong className="text-slate-900 dark:text-white">맞춤 퀘스트</strong>로 포트폴리오를 자동 완성합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-emerald-500/40 active:scale-95"
            >
              <Play className="h-5 w-5 fill-current" />
              {isLoggedIn ? "대시보드로 가기" : "무료로 내 스킬트리 만들기"}
            </button>
            {!isLoggedIn && (
              <button
                onClick={handleTry}
                className="w-full sm:w-auto inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white/80 px-8 py-4 text-base font-bold text-slate-800 backdrop-blur transition-all hover:border-emerald-500 hover:text-emerald-700 active:scale-95 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
              >
                이메일 없이 체험해보기
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/5">
            <span className="flex items-center gap-1"><span className="text-amber-400">⭐</span> 100+ 공고 분석</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1"><span className="text-blue-400">⏳</span> 평균 2주 완성</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><span className="text-emerald-500">💎</span> 지금 가입 시 평생 무료 플랜 유지</span>
          </div>
        </div>

        {/* Bottom: Interactive Canvas Demo (Large) — 세로 트리라 높이를 넉넉히 잡는다 */}
        <div className="w-full h-[560px] md:h-[640px] lg:h-[720px] rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-sky-900/5 overflow-hidden flex flex-col relative group dark:border-white/10 dark:bg-slate-950 dark:shadow-none transition-transform hover:-translate-y-1 duration-500">
          
          {/* macOS Style Window Bar */}
          <div className="h-10 w-full flex-none bg-slate-50/80 border-b border-slate-200/80 flex items-center px-4 justify-between backdrop-blur-sm dark:bg-slate-900/80 dark:border-white/5">
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

          <div className="flex-1 relative w-full min-h-0">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/5 via-transparent to-transparent pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
            <TechTreeCanvas
              nodes={layoutedNodes}
              edges={layoutedEdges}
              onNodesChange={() => {}}
              onEdgesChange={() => {}}
              onInit={handleDemoInit}
              interactive={true}
              hideMinimap={true}
              hideControls={true}
              className="!h-full !min-h-0"
            />
          </div>
        </div>
      </section>

      {/* Trend Preview Widget */}
      {topTrends.length > 0 && (
        <section className="w-full relative z-20 px-6 mt-12 mb-12 max-w-5xl mx-auto">
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
                const maxTotal = Math.max(1, (topTrends[0].wanted_mentions || 0) + (topTrends[0].jumpit_mentions || 0));
                const percent = Math.min(100, Math.round((total / maxTotal) * 100));
                return (
                  <div key={trend.id} className="relative bg-white dark:bg-slate-950/80 rounded-2xl p-5 border border-slate-100 dark:border-white/5 flex flex-col justify-center items-start overflow-hidden group shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5 w-full">
                    <div className="absolute -right-4 -bottom-6 opacity-[0.03] dark:opacity-[0.05] text-[100px] font-black italic select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">{i + 1}</div>
                    
                    <div className="flex items-center justify-between w-full mb-3 z-10">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${i === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'}`}>
                          {i + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{trend.title}</span>
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm text-right flex items-baseline gap-0.5">
                        <span className="text-xl tracking-tight">{total.toLocaleString()}</span>
                        <span className="text-[10px] font-medium text-slate-500">건</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-1.5 z-10 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-400 to-sky-400 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="w-full flex justify-between items-center text-[10px] text-slate-400 z-10 font-medium">
                      <span>채용 수요 지표</span>
                      <span>상위 {percent}%</span>
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
              <div className="text-2xl font-black tracking-tighter text-[#3366FF] flex items-center gap-1">
                <span className="w-6 h-6 rounded-full bg-[#3366FF] text-white flex items-center justify-center text-sm font-bold">w</span>anted
              </div>
            </div>
            {/* Jumpit */}
            <div className="flex items-center gap-2">
              <div className="text-2xl font-black tracking-tighter text-[#00E58B]">jumpit</div>
            </div>
            {/* GitHub */}
            <div className="flex items-center gap-2 opacity-50 grayscale filter transition hover:opacity-100 hover:grayscale-0 dark:opacity-60 dark:hover:opacity-100 dark:hover:grayscale-0">
              <div className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-[#24292F] dark:text-white">
                <svg viewBox="0 0 16 16" width="20" height="20" className="fill-current">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                GitHub
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
              이런 실시간 채용 트렌드를 기반으로, Zarami는 당신만의 퀘스트를 설계합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-10">
            {/* Step 1 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">1</div>
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/40 dark:text-indigo-400">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">진단 및 트렌드 분석</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                채용공고 수백 건 분석으로 시장 수요와 나의 스택을 비교해요.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-rose-500/30">2</div>
              <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/40 dark:text-rose-400">
                <Target className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">맞춤형 퀘스트 생성</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                실제 채용 과제 기반 미니 프로젝트를 맞춤으로 제안해요.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col gap-4 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 border border-slate-100 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none transition-transform hover:-translate-y-2 duration-300">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30">3</div>
              <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-900/40 dark:text-amber-400">
                <GitCommit className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">GitHub 자산화</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                GitHub 커밋이 자동 인증돼 실전 포트폴리오로 완성돼요.
              </p>
            </div>
          </div>
          
          {/* Secondary CTA */}
          <div className="mt-20 text-center">
            <button
              onClick={handleStart}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-slate-900 px-8 py-4 text-base font-bold text-slate-900 dark:border-white dark:text-white transition-all hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 active:scale-95"
            >
              지금 바로 내 스킬트리 진단받기
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border-2 border-slate-100 shadow-xl shadow-slate-200/50 dark:bg-slate-900/40 dark:border-white/10 transition-all hover:shadow-2xl hover:border-emerald-500/30 hover:-translate-y-2">
              <div>
                <div className="flex text-amber-400 mb-4 text-xl">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  &quot;어디서부터 해야 할지 막막했는데, 네이버 공고 기반의 2주 스프린트 덕분에 <strong className="text-slate-900 dark:text-white">2주 만에 React 스킬트리를 완성</strong>하고 원티드를 통해 서류 합격했습니다.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
                <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e0e7ff" alt="Avatar" width={48} height={48} className="rounded-full border-2 border-slate-100 dark:border-slate-700 shadow-sm" unoptimized />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">김*현 <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm dark:bg-slate-800 dark:text-slate-400">주니어 프론트엔드</span></div>
                  <div className="text-xs text-emerald-600 font-semibold dark:text-emerald-400 mt-0.5">3주 만에 취업 성공</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border-2 border-slate-100 shadow-xl shadow-slate-200/50 dark:bg-slate-900/40 dark:border-white/10 transition-all hover:shadow-2xl hover:border-emerald-500/30 hover:-translate-y-2">
              <div>
                <div className="flex text-amber-400 mb-4 text-xl">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  &quot;단순히 인강 듣는 걸 넘어서서, GitHub PR을 올려 인증받는 시스템이 최고예요. <strong className="text-slate-900 dark:text-white">3주 만에 4개의 실무형 퀘스트를 클리어</strong>하고 이력서가 꽉 찼습니다.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
                <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffe4e6" alt="Avatar" width={48} height={48} className="rounded-full border-2 border-slate-100 dark:border-slate-700 shadow-sm" unoptimized />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">이*진 <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm dark:bg-slate-800 dark:text-slate-400">취업 준비생</span></div>
                  <div className="text-xs text-emerald-600 font-semibold dark:text-emerald-400 mt-0.5">4개 퀘스트 자산화 완료</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between rounded-3xl bg-white p-8 border-2 border-slate-100 shadow-xl shadow-slate-200/50 dark:bg-slate-900/40 dark:border-white/10 transition-all hover:shadow-2xl hover:border-emerald-500/30 hover:-translate-y-2">
              <div>
                <div className="flex text-amber-400 mb-4 text-xl">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                  &quot;실시간 트렌드를 보면서 내가 부족했던 &apos;상태관리 아키텍처&apos; 부분을 정확히 짚어냈어요. 가이드대로 <strong className="text-slate-900 dark:text-white">PR 2개를 올리니 바로 잔디 뱃지</strong>를 받았습니다.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
                <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=d1fae5" alt="Avatar" width={48} height={48} className="rounded-full border-2 border-slate-100 dark:border-slate-700 shadow-sm" unoptimized />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">박*수 <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm dark:bg-slate-800 dark:text-slate-400">2년차 백엔드</span></div>
                  <div className="text-xs text-emerald-600 font-semibold dark:text-emerald-400 mt-0.5">트렌드 매칭 100% 달성</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Post-Review small CTA */}
          <div className="mt-16 text-center">
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-all"
            >
              다음은 여러분의 차례입니다. 무료로 시작하기 <ChevronRight className="h-4 w-4" />
            </button>
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
                나중에 유료화되나요?
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
                어떤 직무를 지원하나요?
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
                GitHub 연동은 필수인가요?
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
                className="h-auto opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all"
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
