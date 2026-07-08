import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-950 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50`}
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <OfflineBanner />
              <Sidebar />
              <div className="min-h-screen pl-20">{children}</div>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
