"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";

import { navItems } from "@/components/layout/navItems";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="app-sidebar fixed inset-y-0 left-0 z-[70] hidden overflow-x-hidden border-r border-white/70 bg-white/72 px-3 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl transition-[width,background-color,border-color] duration-300 md:flex dark:border-white/10 dark:bg-slate-950/78 dark:shadow-black/30"
    >
      <div className="flex h-full flex-col">
        <Link
          href="/dashboard"
          className="flex h-12 items-center gap-3 rounded-xl px-2 text-slate-950 transition hover:bg-white/70 dark:text-white dark:hover:bg-white/10"
          aria-label="Zarami 대시보드로 이동"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
            <Sprout className="h-5 w-5" aria-hidden />
          </span>
          <span className="app-sidebar-label min-w-0 translate-x-2 whitespace-nowrap text-sm font-bold opacity-0 transition duration-200">
            Zarami
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="전역 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex h-12 items-center gap-3 rounded-xl px-2 text-sm font-semibold transition duration-200",
                  isActive
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 dark:bg-sky-400 dark:text-slate-950"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="app-sidebar-label min-w-0 translate-x-2 whitespace-nowrap opacity-0 transition duration-200">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
          <ThemeToggle
            showLabel
            className="app-sidebar-theme w-full justify-start overflow-hidden [&>span:last-child]:translate-x-2 [&>span:last-child]:opacity-0 [&>span:last-child]:transition [&>span:last-child]:duration-200"
          />
        </div>
      </div>
    </aside>
  );
}
