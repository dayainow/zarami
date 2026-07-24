import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-slate-900">
        <h1 className="text-lg font-bold">로그인 링크를 확인할 수 없어요</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          링크가 만료됐거나 이미 사용됐을 수 있습니다. 다시 로그인해 주세요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400"
          >
            다시 로그인하기
          </Link>
          <Link
            href="/try"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            체험 계정으로 둘러보기
          </Link>
        </div>
      </div>
    </main>
  );
}
