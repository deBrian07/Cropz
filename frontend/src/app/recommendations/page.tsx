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
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      { key: "year1", title: "Year 1", subtitle: "Start your rotation", color: "from-emerald-500 to-green-600" },
      { key: "year2", title: "Year 2", subtitle: "Build soil health", color: "from-blue-500 to-cyan-600" },
      { key: "year3", title: "Year 3", subtitle: "Optimize nutrients", color: "from-purple-500 to-pink-600" },
      { key: "year4", title: "Year 4", subtitle: "Complete the cycle", color: "from-orange-500 to-red-600" },
    ] as const
  ), []);

  const getRotationGroupIcon = (group: string) => {
    switch (group) {
      case "legumes": return "🫘";
      case "root_veggies": return "🥕";
      case "greens_brassicas": return "🥬";
      case "fruiting": return "🍅";
      default: return "🌾";
    }
  };

  const getRotationGroupColor = (group: string) => {
    switch (group) {
      case "legumes": return "from-green-500 to-emerald-600";
      case "root_veggies": return "from-orange-500 to-amber-600";
      case "greens_brassicas": return "from-lime-500 to-green-600";
      case "fruiting": return "from-red-500 to-pink-600";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getMatchQuality = (pct: number) => {
    if (pct >= 90) return { label: "Excellent", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/20" };
    if (pct >= 80) return { label: "Very Good", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/20" };
    if (pct >= 70) return { label: "Good", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/20" };
    if (pct >= 60) return { label: "Fair", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/20" };
    return { label: "Poor", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/20" };
  };

  if (!data) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden">
        {/* Animated background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-lime-400/20 to-lime-600/10 blur-3xl animate-pulse" />
        </div>

        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🌱</div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">No Recommendations Found</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            Please go back to the dashboard and generate crop recommendations for your land.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-6 py-16 max-w-7xl mx-auto text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-lime-400/20 to-lime-600/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/15 to-purple-400/15 blur-3xl animate-pulse" />
        
        {/* Mouse-following orb */}
        <div 
          className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400/15 to-orange-400/15 blur-2xl transition-all duration-300 ease-out"
          style={{
            left: mousePosition.x - 64,
            top: mousePosition.y - 64,
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-emerald-400/30 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header Section */}
      <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-lime-500 to-green-600 bg-clip-text text-transparent mb-4">
                Crop Rotation Plan
              </h1>
              {meta && (
                <div className="space-y-2">
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    For <span className="font-semibold text-emerald-600 dark:text-emerald-400">{meta.landName}</span>
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {meta.soilType && (
                      <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        🌍 {meta.soilType}
                      </span>
                    )}
                    {meta.N && (
                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        N: {meta.N}
                      </span>
                    )}
                    {meta.P && (
                      <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                        P: {meta.P}
                      </span>
                    )}
                    {meta.K && (
                      <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                        K: {meta.K}
                      </span>
                    )}
                    {meta.pH && (
                      <span className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300">
                        pH: {meta.pH}
                      </span>
                    )}
                    {meta.latitude && meta.longitude && (
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        📍 {meta.latitude.toFixed(3)}, {meta.longitude.toFixed(3)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Link 
              href="/dashboard" 
              className="group flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-105"
            >
              <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Rotation Years */}
      <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="space-y-12">
          {sections.map((sec, sectionIndex) => {
            const list = (data as any)[sec.key] as ScoredCrop[];
            if (!list || list.length === 0) return null;
            
            return (
              <div key={sec.key} className="relative group">
                {/* Year Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${sec.color} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                      {sectionIndex + 1}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{sec.title}</h2>
                      <p className="text-gray-600 dark:text-gray-300">{sec.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Crops Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {list.map((item, idx) => {
                    const matchQuality = getMatchQuality(item.match_pct);
                    const groupColor = getRotationGroupColor(item.rotation_group);
                    
                    return (
                      <div
                        key={`${sec.key}-${item.crop}-${idx}`}
                        className="group/card relative overflow-hidden rounded-3xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-3xl blur opacity-0 group-hover/card:opacity-100 transition duration-500"></div>
                        
                        <div className="relative p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${groupColor} flex items-center justify-center text-white text-xl shadow-lg`}>
                                {getRotationGroupIcon(item.rotation_group)}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{item.crop}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                  {item.rotation_group.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            
                            {/* Match percentage */}
                            <div className="text-right">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${matchQuality.bg} ${matchQuality.color}`}>
                                <div className="w-2 h-2 rounded-full bg-current"></div>
                                {matchQuality.label}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <span>Match Score</span>
                              <span className="font-semibold">{item.match_pct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${sec.color} transition-all duration-1000 ease-out`}
                                style={{ 
                                  width: `${item.match_pct}%`,
                                  animationDelay: `${idx * 200}ms`
                                }}
                              ></div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-gray-800 dark:text-white">
                              {item.match_pct}%
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Perfect for {sec.title.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className={`mt-16 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
          <div className="relative rounded-3xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 p-8 backdrop-blur-xl">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Ready to Start Your Rotation?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              Follow this 4-year rotation plan to maximize soil health, crop yields, and sustainable farming practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard" 
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Plan Another Land
              </Link>
              <button className="px-8 py-4 rounded-2xl border border-white/20 bg-white/50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-300 hover:scale-105">
                Save This Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}