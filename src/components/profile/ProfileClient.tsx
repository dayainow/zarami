"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";

import { buildEmptyHeatmap, useProfileStats } from "@/hooks/useProfileStats";
import { createClient } from "@/utils/supabase/client";

type VillageStage = {
  imageUrl: string;
  label: string;
};

function getVillageStage(progressPercent: number): VillageStage {
  if (progressPercent <= 25) {
    return { imageUrl: "/images/village/lv1.png", label: "정착의 시작 (작은 야영지)" };
  }
  if (progressPercent <= 50) {
    return { imageUrl: "/images/village/lv2.png", label: "마을의 태동 (목조 주택단지)" };
  }
  if (progressPercent <= 75) {
    return { imageUrl: "/images/village/lv3.png", label: "활기찬 소도시 (우물과 상점)" };
  }
  return { imageUrl: "/images/village/lv4.png", label: "웅장한 대도시 (거대한 성과 광장)" };
}

function heatmapCellClassName(count: number): string {
  if (count === 0) return "bg-slate-200/80 dark:bg-white/5";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count === 2) return "bg-emerald-300 dark:bg-emerald-700";
  if (count === 3) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-400";
}

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
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const villageStage = useMemo(() => getVillageStage(progressPercent), [progressPercent]);
  // Guests never fetch stats (query is disabled) and a signed-in user's first
  // render is always mid-fetch, so fall back to the placeholder grid whenever
  // real data isn't available yet - never render a visually empty section.
  const placeholderHeatmap = useMemo(() => buildEmptyHeatmap(), []);
  const heatmapDays = stats?.heatmap ?? placeholderHeatmap;

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
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Zarami Profile
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">내 프로필</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {userId
              ? (sessionUser?.email ?? "로그인된 계정")
              : "게스트로 둘러보는 중입니다. 로그인하면 진행도가 저장돼요."}
          </p>
        </header>

        <section className="rounded-xl border border-white/70 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl border-4 border-slate-200/50 shadow-inner dark:border-white/10">
              <Image src={villageStage.imageUrl} alt={villageStage.label} fill className="object-cover" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-slate-950 dark:text-white">{villageStage.label}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {completedCount}/{totalCount} 스킬 완료 · {progressPercent}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all dark:bg-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-white/70 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">잔디 심기</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">최근 13주간 스킬을 완료한 날짜별 기록입니다.</p>

          <div
            className={[
              "mt-4 grid grid-flow-col grid-rows-7 gap-1",
              !userId ? "pointer-events-none select-none blur-sm" : "",
            ].join(" ")}
            aria-hidden={!userId}
          >
            {heatmapDays.map((day) => (
              <div
                key={day.date}
                title={`${day.date} · ${day.count}건 완료`}
                className={`h-3 w-3 rounded-sm ${heatmapCellClassName(day.count)}`}
              />
            ))}
          </div>

          {userId && isHeatmapLoading ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">불러오는 중...</p>
          ) : null}

          {userId && isHeatmapError ? (
            <p className="mt-3 text-xs text-red-600 dark:text-red-300">잔디 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          ) : null}

          {!userId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/65 p-6 backdrop-blur-2xl dark:bg-slate-950/65">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">로그인하면 잔디 기록을 볼 수 있어요</p>
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
        </section>
      </div>
    </main>
  );
}
