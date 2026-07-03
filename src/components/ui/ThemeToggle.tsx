"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed right-5 top-5 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-50 dark:border-white/10 dark:bg-slate-950/65 dark:text-slate-100 dark:shadow-black/30 dark:hover:bg-slate-900/80 dark:focus:ring-offset-slate-950"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <span className="relative grid h-5 w-5 place-items-center">
        <Sun
          className={[
            "absolute h-5 w-5 transition duration-300",
            isDark ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          ].join(" ")}
          aria-hidden
        />
        <Moon
          className={[
            "absolute h-5 w-5 transition duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
          ].join(" ")}
          aria-hidden
        />
      </span>
    </button>
  );
}
