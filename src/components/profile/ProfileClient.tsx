"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { buildCompletedSkillIdSet, dashboardSkillNodes } from "@/data/skill-tree";
import { buildEmptyHeatmap, useProfileStats } from "@/hooks/useProfileStats";
import { useSkillStore } from "@/stores/useSkillStore";
import { createClient } from "@/utils/supabase/client";

type PlantStage = {
  emoji: string;
  label: string;
};

function getPlantStage(progressPercent: number): PlantStage {
  if (progressPercent <= 20) {
    return { emoji: "🌱", label: "자람이의 흙을 고르는 중" };
  }
  if (progressPercent <= 50) {
    return { emoji: "🌿", label: "파릇파릇 싹이 틔었어요!" };
  }
  if (progressPercent <= 80) {
    return { emoji: "🌾", label: "폭풍 성장 중인 자람이" };
  }
  return { emoji: "🌸", label: "정원에 멋진 꽃이 피었습니다" };
}

function heatmapCellClassName(count: number): string {
  if (count === 0) return "bg-white/5";
  if (count === 1) return "bg-emerald-900";
  if (count === 2) return "bg-emerald-700";
  if (count === 3) return "bg-emerald-500";
  return "bg-emerald-400";
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
  const completedSkillIds = useSkillStore((state) => state.completedSkillIds);
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

  const totalCount = dashboardSkillNodes.length;
  const completedCount = useMemo(
    () => buildCompletedSkillIdSet(completedSkillIds).size,
    [completedSkillIds],
  );
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const plantStage = useMemo(() => getPlantStage(progressPercent), [progressPercent]);
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
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white dark:bg-black">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Zarami Profile</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">내 프로필</h1>
          <p className="mt-2 text-sm text-slate-400">
            {userId
              ? (sessionUser?.email ?? "로그인된 계정")
              : "게스트로 둘러보는 중입니다. 로그인하면 진행도가 저장돼요."}
          </p>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl" aria-hidden>
              {plantStage.emoji}
            </span>
            <div>
              <p className="text-lg font-semibold text-white">{plantStage.label}</p>
              <p className="mt-1 text-sm text-slate-400">
                {completedCount}/{totalCount} 스킬 완료 · {progressPercent}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-sm font-semibold text-white">잔디 심기</h2>
          <p className="mt-1 text-xs text-slate-400">최근 13주간 스킬을 완료한 날짜별 기록입니다.</p>

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
            <p className="mt-3 text-xs text-slate-500">불러오는 중...</p>
          ) : null}

          {userId && isHeatmapError ? (
            <p className="mt-3 text-xs text-red-300">잔디 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          ) : null}

          {!userId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/60 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-slate-200">로그인하면 잔디 기록을 볼 수 있어요</p>
              {emailSent ? (
                <p className="mt-2 text-sm text-emerald-400">✅ 이메일로 로그인 링크를 보냈습니다!</p>
              ) : (
                <form onSubmit={handleLogin} className="mt-2 flex w-full max-w-xs flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소 입력"
                    required
                    className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-300 disabled:opacity-50"
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
