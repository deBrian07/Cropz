import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/components/AuthButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cropz",
  description: "Smart crop rotation planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <nav className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:border-white/10 dark:bg-neutral-900/60 dark:supports-[backdrop-filter]:bg-neutral-900/40">
              <Link href="/dashboard" aria-label="Cropz home" className="text-base font-semibold tracking-tight">
                <span className="mr-1">🌱</span>
                <span className="bg-gradient-to-r from-emerald-500 to-lime-400 bg-clip-text text-transparent">Cropz</span>
              </Link>
              <div className="flex items-center gap-2">
                <AuthButton />
              </div>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
