"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-24 text-center dark:bg-slate-950">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
        문제가 발생했습니다.
      </h1>
      <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
        페이지를 불러오는 도중 예상치 못한 오류가 발생했습니다.<br />
        잠시 후 다시 시도해주세요.
      </p>
      
      {/* 개발 환경에서는 에러 상세 표시 */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 w-full max-w-2xl rounded-xl bg-slate-100 p-4 text-left dark:bg-slate-900 overflow-x-auto border border-red-200 dark:border-red-900">
          <p className="text-sm font-mono text-red-600 dark:text-red-400">{error.message}</p>
        </div>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <RefreshCcw className="h-4 w-4" />
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:ring-white/10 dark:hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
