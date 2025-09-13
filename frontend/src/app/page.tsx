import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-white to-green-50">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-semibold tracking-tight">Cropz</h1>
        <p className="mt-4 text-gray-600 text-lg">
          Plan smarter crop rotations with a simple soil flowchart and local data.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <AuthButton />
          <Link
            href="/dashboard"
            className="rounded-full border border-gray-300 px-5 py-2 hover:bg-gray-100"
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
