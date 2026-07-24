"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sprout } from "lucide-react";

import { TRIAL_EMAIL, TRIAL_PASSWORD } from "@/lib/auth/trial";
import { createClient } from "@/utils/supabase/client";

type TryStatus = "signing-in" | "done" | "error";

export function TryClient() {
  const router = useRouter();
  const [status, setStatus] = useState<TryStatus>("signing-in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function signInAsTrial() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (!cancelled) {
          setStatus("done");
          router.replace("/manage-tree");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: TRIAL_EMAIL,
        password: TRIAL_PASSWORD,
      });

      if (cancelled) return;

      if (error) {
        setStatus("error");
        setErrorMessage(
          "체험 계정에 로그인하지 못했어요. Supabase에 test@example.com / testpassword123 계정이 있는지 확인해 주세요.",
        );
        return;
      }

      setStatus("done");
      router.replace("/manage-tree");
    }

    void signInAsTrial();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <Link href="/" className="mb-6 inline-block">
          <Image
            src="/images/brand/svg/zarami-logo-horizontal.svg"
            alt="Zarami"
            width={120}
            height={40}
            priority
            className="mx-auto h-auto dark:brightness-200 dark:grayscale"
          />
        </Link>

        {status === "error" ? (
          <>
            <h1 className="text-lg font-bold">체험 로그인 실패</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {errorMessage}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400"
              >
                이메일로 로그인하기
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
              >
                랜딩으로 돌아가기
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              {status === "signing-in" ? (
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
              ) : (
                <Sprout className="h-7 w-7" aria-hidden />
              )}
            </div>
            <h1 className="text-lg font-bold">체험 계정으로 입장 중…</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              이메일 없이 스킬트리 편집기를 바로 열어드려요.
              <br />
              체험 데이터는 공유 계정에 저장됩니다.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
