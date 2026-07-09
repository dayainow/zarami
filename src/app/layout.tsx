import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zarami Dashboard",
  description: "React Flow based career tech-tree dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${geistMono.variable} bg-slate-50 text-slate-950 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50`}
      >
        <ThemeProvider>
          <QueryProvider>
            <OfflineBanner />
            <Sidebar />
            <MobileTabBar />
            <div className="min-h-screen pb-16 md:pb-0 md:pl-20">{children}</div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
