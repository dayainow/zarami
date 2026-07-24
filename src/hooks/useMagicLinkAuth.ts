"use client";

import { useEffect, useState, type FormEvent } from "react";

import { buildMagicLinkRedirectTo, TRIAL_EMAIL, TRIAL_PASSWORD } from "@/lib/auth/trial";
import { createClient } from "@/utils/supabase/client";

export type SessionUser = {
  id: string;
  email: string | null;
};

// Mirrors the magic-link session/login state already duplicated in
// ProfileClient and AdminEditorClient - new call sites should use this
// instead of re-inlining another copy.
export function useMagicLinkAuth(options?: { nextPath?: string }) {
  const nextPath = options?.nextPath ?? "/dashboard";
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!loginEmail) return;

    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: {
        emailRedirectTo: buildMagicLinkRedirectTo(window.location.origin, nextPath),
      },
    });
    setIsSending(false);

    if (!error) {
      setEmailSent(true);
    } else {
      alert("로그인 이메일 전송에 실패했습니다.");
    }
  };

  const handleTestLogin = async () => {
    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: TRIAL_EMAIL,
      password: TRIAL_PASSWORD,
    });
    setIsSending(false);

    if (error) {
      alert(
        "체험 계정 로그인에 실패했습니다. Supabase 대시보드에서 test@example.com / testpassword123 계정을 생성해주세요.",
      );
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return {
    userId: sessionUser?.id ?? null,
    userEmail: sessionUser?.email ?? null,
    authChecked,
    loginEmail,
    setLoginEmail,
    isSending,
    emailSent,
    handleLogin,
    handleTestLogin,
    handleLogout,
  };
}
