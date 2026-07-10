"use client";

import { useEffect, useState } from "react";
import { Printer, Mail, Trophy, Clock, Flame, Briefcase } from "lucide-react";

import { useProfileStats } from "@/hooks/useProfileStats";
import { createClient } from "@/utils/supabase/client";

export function ResumeClient() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
  
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
    });
  }, []);

  const userId = sessionUser?.id ?? null;
  const { data: stats, isLoading } = useProfileStats(userId);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px] rounded-xl bg-white p-12 shadow-xl print:m-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {/* 헤더 섹션: 액션 버튼 (인쇄 시 숨김) */}
        <div className="mb-8 flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            PDF로 저장 / 인쇄
          </button>
        </div>

        {/* 이력서 본문 (Notion 스타일) */}
        <div className="space-y-10 text-slate-900">
          <header className="border-b border-slate-200 pb-6">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              기술 스택 요약 & 포트폴리오
            </h1>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 text-slate-600">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                {sessionUser?.email ?? "email@example.com"}
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                Zarami 자동 생성 이력서
              </span>
            </div>
          </header>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">핵심 지표 (Zarami Growth)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold">달성 스킬</span>
                </div>
                <p className="mt-2 text-2xl font-black">{stats.completedCount}개</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-bold">누적 학습</span>
                </div>
                <p className="mt-2 text-2xl font-black">{Math.round((stats.totalEstimatedMinutes ?? 0) / 60)}시간</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <Flame className="h-5 w-5" />
                  <span className="font-bold">최대 연속 학습</span>
                </div>
                <p className="mt-2 text-2xl font-black">{stats.maxStreak}일</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">스킬 스택 분포</h2>
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(stats.categoryStats).map(([cat, counts]) => {
                if (counts.completed === 0) return null;
                const percent = Math.round((counts.completed / counts.total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                      <span>{cat}</span>
                      <span>{percent}% ({counts.completed}개)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-slate-800" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">최근 달성 및 획득한 스킬 상세</h2>
            {stats.completedSkills && stats.completedSkills.length > 0 ? (
              <ul className="space-y-3">
                {stats.completedSkills.map((skill, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-semibold text-slate-800">{skill}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">아직 달성한 스킬이 없습니다.</p>
            )}
          </section>

          <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
            이 이력서는 Zarami 서비스를 통해 자동으로 인증되고 생성되었습니다.
          </footer>
        </div>
      </div>
    </div>
  );
}
