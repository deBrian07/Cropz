"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ScoredCrop = {
  crop: string;
  match_pct: number;
  rotation_group: "legumes" | "root_veggies" | "greens_brassicas" | "fruiting" | string;
};

type RotationScoreRes = {
  year1: ScoredCrop[];
  year2: ScoredCrop[];
  year3: ScoredCrop[];
  year4: ScoredCrop[];
};

export default function RecommendationsPage() {
  const [data, setData] = useState<RotationScoreRes | null>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cropz.rotationScores");
      const metaRaw = sessionStorage.getItem("cropz.rotationScores.meta");
      if (raw) setData(JSON.parse(raw));
      if (metaRaw) setMeta(JSON.parse(metaRaw));
    } catch {}
  }, []);

  const sections = useMemo(() => (
    [
      { key: "year1", title: "Year 1" },
      { key: "year2", title: "Year 2" },
      { key: "year3", title: "Year 3" },
      { key: "year4", title: "Year 4" },
    ] as const
  ), []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="text-center">
          <div className="text-5xl mb-4">🌱</div>
          <div className="text-lg text-gray-600 dark:text-gray-300 mb-6">No recommendations found</div>
          <Link href="/dashboard" className="px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const Pill = ({ pct }: { pct: number }) => {
    const label = pct >= 90 ? "STRONG MATCH" : pct >= 70 ? "GOOD MATCH" : "WEAK MATCH";
    return (
      <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full bg-gradient-to-b from-neutral-900 to-black text-white shadow-xl">
        <div className="text-3xl font-bold">{pct}%</div>
        <div className="text-[10px] tracking-widest text-emerald-300 mt-1">{label}</div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen px-6 py-16 max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Recommended Crops by Rotation</h1>
          {meta && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Land: <span className="font-medium">{meta.landName}</span>
              {meta.soilType ? ` • Soil: ${meta.soilType}` : ""}
              {meta.N ? ` • N:${meta.N}` : ""}
              {meta.P ? ` • P:${meta.P}` : ""}
              {meta.K ? ` • K:${meta.K}` : ""}
              {meta.pH ? ` • pH:${meta.pH}` : ""}
              {meta.latitude && meta.longitude ? ` • 📍 ${meta.latitude.toFixed?.(3)}, ${meta.longitude.toFixed?.(3)}` : ""}
            </p>
          )}
        </div>
        <Link href="/dashboard" className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">← Back</Link>
      </div>

      {sections.map((sec) => {
        const list = (data as any)[sec.key] as ScoredCrop[];
        if (!list || list.length === 0) return null;
        return (
          <div key={sec.key} className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{sec.title}</h2>
            <div className="space-y-4">
              {list.map((item, idx) => (
                <div key={`${sec.key}-${item.crop}-${idx}`} className="relative group rounded-2xl border border-white/20 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-5 flex items-center justify-between overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white flex items-center justify-center text-xl">🌾</div>
                    <div>
                      <div className="text-lg font-semibold">{item.crop}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {item.rotation_group.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Pill pct={item.match_pct} />
                  </div>
                  <div className="absolute inset-y-0 right-36 w-px bg-gradient-to-b from-transparent via-gray-200/60 to-transparent dark:via-white/10" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

