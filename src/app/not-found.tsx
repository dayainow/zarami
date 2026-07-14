"use client";

import Link from "next/link";
import { Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-24 text-center dark:bg-slate-950">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shadow-inner">
        <Sparkles className="h-10 w-10" />
      </div>
      
      <h1 className="mt-8 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl">
        404
      </h1>
      <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-200">
        길을 잃으셨나요? 스킬트리에 없는 노드입니다.
      </p>
      <p className="mt-4 max-w-md text-base text-slate-600 dark:text-slate-400">
        입력하신 주소가 잘못되었거나, 더 이상 존재하지 않는 퀘스트일 수 있습니다. 안전한 대시보드로 돌아가 새로운 여정을 시작하세요.
      </p>

      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:from-sky-400 hover:to-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <Home className="h-4 w-4" />
          내 로드맵으로 복귀
        </Link>
      </div>
    </div>
  );
}
