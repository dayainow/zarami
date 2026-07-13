"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { navItems } from "@/components/layout/navItems";
import { useSupabaseUserId } from "@/hooks/useSupabaseUserId";

export function Sidebar() {
  const pathname = usePathname();
  const userId = useSupabaseUserId();

  if (!userId) return null;

  return (
    <aside
      className="group fixed inset-y-0 left-0 z-[70] hidden w-[5rem] overflow-x-hidden border-r border-white/70 bg-white/72 px-3 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl transition-[width,background-color,border-color] duration-300 hover:w-64 focus-within:w-64 md:flex dark:border-white/10 dark:bg-slate-950/78 dark:shadow-black/30"
    >
      <div className="flex h-full w-full flex-col">
        <Link
          href="/dashboard"
          className="flex h-16 items-center justify-center px-2"
          aria-label="Zarami 대시보드로 이동"
        >
          <div className="relative flex items-center justify-center">
            <Image
              src="/images/brand/svg/zarami-symbol.svg"
              alt="Zarami"
              width={32}
              height={32}
              priority
              className="absolute opacity-100 transition-opacity duration-300 group-hover:opacity-0"
            />
            <Image
              src="/images/brand/svg/zarami-logo-horizontal.svg"
              alt="Zarami"
              width={120}
              height={32}
              priority
              className="opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:brightness-200 dark:grayscale"
            />
          </div>
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
                <div className="flex min-w-0 flex-col translate-x-2 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                  <span className="whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.subLabel && (
                    <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                      {item.subLabel}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
