"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import SoilTextureWizard from "@/components/SoilTextureWizard";

export default function Dashboard() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setName(u?.displayName ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold">{`Welcome${name ? ", " + name.split(" ")[0] : "!"}`}</h1>
      <p className="text-gray-600 mt-2">Create a new land by identifying soil texture with a quick, guided flow.</p>
      <div className="mt-8">
        <SoilTextureWizard />
      </div>
    </div>
  );
}

