"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { useSupabaseUserId } from "@/hooks/useSupabaseUserId";

export function LoginClient() {
  const router = useRouter();
  const userId = useSupabaseUserId();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (userId) {
      router.replace("/dashboard");
    }
  }, [userId, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSending(true);
    const supabase = createClient();
    
    // Redirect to dashboard after magic link login
    const redirectUrl = new URL("/dashboard", window.location.origin).href;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    
    setIsSending(false);
    
    if (!error) {
      setEmailSent(true);
    } else {
      alert("로그인 이메일 전송에 실패했습니다: " + error.message);
    }
  };

  const handleTestLogin = async () => {
    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "testpassword123",
    });
    setIsSending(false);

    if (error) {
      alert("테스트 계정 로그인 실패: Supabase 대시보드에서 test@example.com (PW: testpassword123) 계정을 먼저 생성해주세요.");
    } else {
      router.replace("/dashboard");
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-5 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="absolute left-4 top-4 md:left-8 md:top-8 z-10">
        <Link 
          href="/"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center">
          <Link href="/" className="mb-6">
            <Image
              src="/images/brand/svg/zarami-logo-horizontal.svg"
              alt="Zarami"
              width={140}
              height={48}
              priority
              className="h-auto dark:brightness-200 dark:grayscale object-contain"
            />
          </Link>
          <h1 className="text-center text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
            환영합니다!
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
            당신만의 기술 로드맵을 그려보세요.
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-3xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/40 sm:p-10">
          {emailSent ? (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-900/30 dark:text-emerald-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">메일함을 확인해주세요!</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                <strong className="text-emerald-600 dark:text-emerald-400">{email}</strong>(으)로<br />로그인 매직 링크가 발송되었습니다.
              </p>
              <button
                onClick={() => setEmailSent(false)}
                className="mt-8 text-xs font-semibold text-slate-400 underline underline-offset-4 hover:text-slate-600 dark:hover:text-slate-300"
              >
                다른 이메일로 다시 시도하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  이메일 주소
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSending || !email}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
              >
                {isSending ? (
                  "매직 링크 전송 중..."
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 transition-transform group-hover:-rotate-12" />
                    매직 링크로 로그인 (이메일 확인 필요)
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-500">
              이메일만으로 간편하게 시작할 수 있습니다.<br />
              비밀번호를 기억할 필요가 없어요.
            </p>
            <button
              type="button"
              onClick={handleTestLogin}
              disabled={isSending}
              className="text-[10px] font-semibold text-slate-400 underline underline-offset-4 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              개발/테스트용 임시 계정으로 빠른 로그인
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
