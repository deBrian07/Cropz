"use client";

import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { useState, useEffect } from "react";

export default function Home() {
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

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* Animated background with mouse tracking */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Main gradient orbs */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-lime-400/30 to-lime-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse" />
        
        {/* Mouse-following orb */}
        <div 
          className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 blur-2xl transition-all duration-300 ease-out"
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
              className="absolute h-1 w-1 rounded-full bg-emerald-400/40 animate-ping"
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

      <div className="w-full max-w-4xl">
        {/* Hero Section */}
        <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 via-lime-500 to-green-500 text-white text-3xl mb-6 shadow-2xl animate-bounce">
              🌱
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-lime-500 to-green-600 bg-clip-text text-transparent mb-6 animate-pulse">
              Cropz
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-white/80 max-w-2xl mx-auto leading-relaxed">
              Plan smarter crop rotations with AI-powered soil analysis and local weather data
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-lime-500 to-green-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            
            <div className="relative rounded-3xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl">
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="group/item">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl shadow-lg group-hover/item:scale-110 transition-transform duration-300">
                    🤖
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">AI-Powered</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Machine learning recommendations</p>
                </div>
                
                <div className="group/item">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-2xl shadow-lg group-hover/item:scale-110 transition-transform duration-300">
                    🌍
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Location-Aware</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Local weather & soil data</p>
                </div>
                
                <div className="group/item">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg group-hover/item:scale-110 transition-transform duration-300">
                    📊
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Data-Driven</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Scientific soil analysis</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="group/btn">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full blur opacity-30 group-hover/btn:opacity-50 transition duration-300"></div>
                    <AuthButton />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/dashboard"
                    className="group/guest relative px-8 py-4 rounded-full border-2 border-gray-300 dark:border-white/20 text-gray-800 dark:text-white/80 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <span className="relative z-10">Continue as guest</span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/10 to-lime-500/10 opacity-0 group-hover/guest:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                  
                  <a
                    href="#features"
                    className="group/learn relative px-8 py-4 rounded-full text-gray-600 dark:text-white/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Learn more
                      <span className="group-hover/learn:translate-x-1 transition-transform duration-300">→</span>
                    </span>
                  </a>
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500 dark:text-white/50">
                No spam. You can sign out anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className={`mt-20 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">Why Choose Cropz?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Revolutionize your farming with cutting-edge technology and data science
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🧠",
                title: "Smart Analysis",
                description: "Advanced ML algorithms analyze soil composition, weather patterns, and crop compatibility to provide optimal recommendations."
              },
              {
                icon: "🌦️",
                title: "Weather Integration",
                description: "Real-time weather data integration ensures your crop choices are optimized for current and forecasted conditions."
              },
              {
                icon: "📈",
                title: "Yield Optimization",
                description: "Maximize your harvest potential with data-driven insights on crop rotation, timing, and resource allocation."
              },
              {
                icon: "🌱",
                title: "Sustainable Farming",
                description: "Promote soil health and sustainability through intelligent crop rotation planning and organic farming practices."
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl border border-white/20 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
