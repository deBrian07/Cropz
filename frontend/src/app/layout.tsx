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
            <nav className="group flex items-center justify-between rounded-2xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 px-6 py-3 shadow-lg backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <Link 
                href="/" 
                aria-label="Cropz home" 
                className="group/logo flex items-center gap-2 text-lg font-bold tracking-tight hover:scale-105 transition-transform duration-300"
              >
                <span className="text-2xl group-hover/logo:animate-bounce">🌱</span>
                <span className="bg-gradient-to-r from-emerald-500 via-lime-500 to-green-500 bg-clip-text text-transparent group-hover/logo:animate-pulse">
                  Cropz
                </span>
              </Link>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                  <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300">
                    Features
                  </a>
                  <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300">
                    About
                  </a>
                  <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300">
                    Contact
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <AuthButton />
                </div>
              </div>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
