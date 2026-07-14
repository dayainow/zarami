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
  metadataBase: new URL("https://zarami.io"), // Replace with your actual production domain
  title: {
    default: "Zarami - 당신만의 커리어 로드맵",
    template: "%s | Zarami",
  },
  description: "채용 공고 데이터 기반 실전 스킬트리로 당신의 커리어를 성장시키세요.",
  keywords: ["개발자 커리어", "스킬트리", "포트폴리오", "취업 준비", "개발자 로드맵", "Zarami", "자람이"],
  authors: [{ name: "Zarami Team" }],
  creator: "Zarami",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://zarami.io",
    title: "Zarami - 실무형 개발자 커리어 가이드",
    description: "실시간 채용 트렌드를 바탕으로 나만의 프론트엔드/백엔드 성장 퀘스트를 깎아 나가는 공간.",
    siteName: "Zarami",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zarami - 당신만의 커리어 로드맵",
    description: "채용 공고 데이터 기반 실전 스킬트리로 당신의 커리어를 성장시키세요.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/images/brand/symbol/zarami-symbol-1024.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
