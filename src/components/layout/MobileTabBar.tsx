"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/navItems";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useMagicLinkAuth } from "@/hooks/useMagicLinkAuth";
import { LogOut } from "lucide-react";

// Sidebar.tsx's fixed left rail relies on mouse hover to reveal labels,
// which doesn't exist on touch devices - this is the mobile equivalent,
// shown only below the md breakpoint (see layout.tsx).
export function MobileTabBar() {
  const pathname = usePathname();
  const { userId, handleLogout } = useMagicLinkAuth();

  if (!userId) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] flex items-center justify-around border-t border-white/70 bg-white/85 px-1 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-slate-900/10 backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-slate-950/85 dark:shadow-black/30"
      aria-label="전역 메뉴"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-1 py-1.5 px-0.5 min-w-0 transition",
              isActive
                ? "text-sky-600 dark:text-sky-300"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="w-full text-center text-[10px] font-semibold truncate">
              {item.mobileLabel || item.label}
            </span>
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 min-w-0 transition text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
        title="로그아웃"
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden />
        <span className="w-full text-center text-[10px] font-semibold truncate">
          로그아웃
        </span>
      </button>
      <div className="flex flex-col items-center justify-center py-1.5 px-1 min-w-0">
        <ThemeToggle className="!h-8 !w-8 border-none !bg-transparent !shadow-none hover:!bg-transparent dark:!bg-transparent" />
      </div>
    </nav>
  );
}
