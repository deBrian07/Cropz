import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl" />
      </div>

      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-8 text-center shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:border-white/10 dark:bg-neutral-900/60 dark:supports-[backdrop-filter]:bg-neutral-900/40">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 text-white">🌱</div>
          <h1 className="text-4xl font-semibold tracking-tight">Cropz</h1>
          <p className="mt-3 text-gray-600 dark:text-white/70">
            Plan smarter crop rotations with a simple soil flowchart and local data.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex justify-center">
              <AuthButton />
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-gray-300 px-5 py-2 text-gray-800 hover:bg-gray-100 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10"
            >
              Continue as guest
            </Link>
            <a
              href="#why"
              className="rounded-full px-5 py-2 text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
            >
              Learn more
            </a>
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-white/50">
            No spam. You can sign out anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
