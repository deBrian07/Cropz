"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, rtdb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref, set, update, remove } from "firebase/database";
import SoilTextureWizard, { SoilTextureWizardResult } from "@/components/SoilTextureWizard";
import Modal from "@/components/Modal";
import { fetchLocationInBackground, getCurrentLocation } from "@/lib/geolocation";

type Land = {
  id: string;
  name: string;
  soilType?: string;
  nitrogen?: string;
  phosphorus?: string;
  potassium?: string;
  pH?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [lands, setLands] = useState<Land[]>([]);
  const [activeLandId, setActiveLandId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editLandId, setEditLandId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNewSoilType, setEditNewSoilType] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [landStep, setLandStep] = useState<"overview" | "nutrients">("overview");
  const [tempNitrogen, setTempNitrogen] = useState<string>("");
  const [tempPhosphorus, setTempPhosphorus] = useState<string>("");
  const [tempPotassium, setTempPotassium] = useState<string>("");
  const [tempPH, setTempPH] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [recommending, setRecommending] = useState(false);
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("auto");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setName(u?.displayName ?? null);
      setUid(u?.uid ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch location in background
  useEffect(() => {
    if (isLoaded) {
      fetchLocationInBackground();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!rtdb || !uid) return;
    const landsRef = ref(rtdb, `users/${uid}/lands`);

    const fetchLands = async () => {
      try {
        const snap = await get(landsRef);
        const docs: Land[] = snap.exists()
          ? Object.entries(snap.val() as Record<string, Partial<Land>>).map(([id, data]) => ({
              id,
              name: (data.name as string) ?? "",
              soilType: data.soilType,
              nitrogen: data.nitrogen,
              phosphorus: data.phosphorus,
              potassium: data.potassium,
              pH: data.pH,
            }))
          : [];
        setLands(docs);
        setActiveLandId((currentActiveLandId) => {
          if (currentActiveLandId === null && docs.length > 0) {
            return docs[0].id;
          }
          if (currentActiveLandId && !docs.some((l) => l.id === currentActiveLandId)) {
            return docs.length > 0 ? docs[0].id : null;
          }
          return currentActiveLandId;
        });
      } catch (e: any) {
        console.warn("RTDB lands fetch error:", e?.code ?? e?.name, e?.message);
      }
    };

    void fetchLands();
    const pollId = window.setInterval(fetchLands, 10000);

    return () => window.clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtdb, uid]);

  // Reset step and sync temp fields only when the active land changes
  useEffect(() => {
    if (!activeLandId) return;
    setLandStep("overview");
    const land = lands.find((l) => l.id === activeLandId);
    setTempNitrogen(land?.nitrogen ?? "");
    setTempPhosphorus(land?.phosphorus ?? "");
    setTempPotassium(land?.potassium ?? "");
    setTempPH(land?.pH ?? "");
    // Intentionally not depending on `lands` to avoid resetting while editing due to polling updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLandId]);

  if (loading) return null;

  const handleSaveSoil = async (result: SoilTextureWizardResult) => {
    const id = crypto.randomUUID();
    const displayName = tempName.trim() || `Land ${lands.length + 1}`;
    const newLand = { id, name: displayName, soilType: result.texture };
    setLands((prev) => [...prev, newLand]);
    setActiveLandId(id);
    setTempName("");
    setCreateOpen(false);
    try {
      if (rtdb && uid) {
        await set(ref(rtdb, `users/${uid}/lands/${id}`), newLand);
      }
    } catch (e: any) {
      console.warn("Failed to create land:", e?.code ?? e?.name, e?.message);
    }
  };

  const openEditForActive = () => {
    if (!activeLandId) return;
    const land = lands.find((l) => l.id === activeLandId);
    if (!land) return;
    setEditLandId(land.id);
    setEditName(land.name);
    setEditNewSoilType(undefined);
    setEditOpen(true);
  };

  const handleEditWizardComplete = (result: SoilTextureWizardResult) => {
    setEditNewSoilType(result.texture);
  };

  const handleSaveEdit = async () => {
    if (!editLandId) return;
    setLands((prev) =>
      prev.map((l) =>
        l.id === editLandId
          ? { ...l, name: editName.trim() || l.name, soilType: editNewSoilType ?? l.soilType }
          : l
      )
    );
    setActiveLandId(editLandId);
    setEditOpen(false);
    setEditLandId(null);
    setEditNewSoilType(undefined);
    try {
      if (rtdb && uid) {
        const updates: Partial<Land> = { name: editName.trim() || (lands.find((l) => l.id === editLandId)?.name ?? "") };
        if (editNewSoilType) updates.soilType = editNewSoilType;
        await update(ref(rtdb, `users/${uid}/lands/${editLandId}`), updates as any);
      }
    } catch (e: any) {
      console.warn("Failed to update land:", e?.code ?? e?.name, e?.message);
    }
  };

  const openDeleteForActive = () => {
    if (!activeLandId) return;
    setDeleteOpen(true);
  };

  const openNutrientInputs = () => {
    setLandStep("nutrients");
  };

  const saveNutrientInputs = async () => {
    if (!activeLandId) return;
    const nitrogen = tempNitrogen.trim() === "" ? undefined : tempNitrogen.trim();
    const phosphorus = tempPhosphorus.trim() === "" ? undefined : tempPhosphorus.trim();
    const potassium = tempPotassium.trim() === "" ? undefined : tempPotassium.trim();
    const pH = tempPH.trim() === "" ? undefined : tempPH.trim();
    setLands((prev) =>
      prev.map((l) =>
        l.id === activeLandId
          ? {
              ...l,
              nitrogen: nitrogen,
              phosphorus: phosphorus,
              potassium: potassium,
              pH: pH,
            }
          : l
      )
    );
    setLandStep("overview");
    try {
      if (rtdb && uid) {
        const updates: Partial<Land> = {};
        if (nitrogen !== undefined) updates.nitrogen = nitrogen as string;
        if (phosphorus !== undefined) updates.phosphorus = phosphorus as string;
        if (potassium !== undefined) updates.potassium = potassium as string;
        if (pH !== undefined) updates.pH = pH as string;
        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb, `users/${uid}/lands/${activeLandId}`), updates as any);
        }
      }
    } catch (e: any) {
      console.warn("Failed to save nutrients:", e?.code ?? e?.name, e?.message);
    }
  };

  const confirmDelete = async () => {
    if (!activeLandId) return;
    const remaining = lands.filter((l) => l.id !== activeLandId);
    setLands(remaining);
    setActiveLandId(remaining.length ? remaining[0].id : null);
    setDeleteOpen(false);
    try {
      if (rtdb && uid) {
        await remove(ref(rtdb, `users/${uid}/lands/${activeLandId}`));
      }
    } catch (e: any) {
      console.warn("Failed to delete land:", e?.code ?? e?.name, e?.message);
    }
  };

  const mapPHCategoryToValue = (cat: string | undefined): number | null => {
    if (!cat) return null;
    if (cat.includes("Acidic")) return 5.5;
    if (cat.includes("Neutral")) return 6.7;
    if (cat.includes("Alkaline")) return 7.8;
    return null;
  };

  const mapSoilTypeToBackend = (soilType: string | undefined): ("sandy"|"clay"|"silt"|"peat"|"chalk"|"loam") | null => {
    if (!soilType) return null;
    const s = soilType.toLowerCase();
    if (s.includes("clay")) return "clay";
    if (s.includes("silt")) return "silt";
    if (s.includes("sand")) return "sandy";
    if (s.includes("peat")) return "peat";
    if (s.includes("chalk")) return "chalk";
    if (s.includes("loam")) return "loam";
    return null;
  };

  const handleRecommend = async () => {
    if (!activeLandId) return;
    const active = lands.find((l) => l.id === activeLandId);
    if (!active) return;

    // Ensure required inputs exist
    if (!active.nitrogen || !active.phosphorus || !active.potassium || !active.pH) {
      setLandStep("nutrients");
      return;
    }

    const nitrogen = parseInt(active.nitrogen, 10);
    const phosphorus = parseInt(active.phosphorus, 10);
    const potassium = parseInt(active.potassium, 10);
    const ph = mapPHCategoryToValue(active.pH);
    if (Number.isNaN(nitrogen) || Number.isNaN(phosphorus) || Number.isNaN(potassium) || ph === null) {
      setLandStep("nutrients");
      return;
    }

    setRecommending(true);
    setLocationError("");
    
    try {
      let latitude: number | undefined = undefined;
      let longitude: number | undefined = undefined;

      if (locationMode === "manual") {
        // Use manual coordinates
        const lat = parseFloat(manualLatitude);
        const lng = parseFloat(manualLongitude);
        
        if (isNaN(lat) || isNaN(lng)) {
          setLocationError("Please enter valid latitude and longitude values");
          setRecommending(false);
          return;
        }
        
        if (lat < -90 || lat > 90) {
          setLocationError("Latitude must be between -90 and 90");
          setRecommending(false);
          return;
        }
        
        if (lng < -180 || lng > 180) {
          setLocationError("Longitude must be between -180 and 180");
          setRecommending(false);
          return;
        }
        
        latitude = lat;
        longitude = lng;
      } else {
        // Get geolocation automatically
        try {
          const loc = await getCurrentLocation();
          latitude = loc.latitude;
          longitude = loc.longitude;
        } catch (error) {
          // Fallback to last known location
          try {
            const last = (window as any).lastKnownLocation;
            if (last) {
              latitude = last.latitude;
              longitude = last.longitude;
            } else {
              setLocationError("Unable to get your location. Please switch to manual mode and enter coordinates.");
              setRecommending(false);
              return;
            }
          } catch {
            setLocationError("Unable to get your location. Please switch to manual mode and enter coordinates.");
            setRecommending(false);
            return;
          }
        }
      }

      const soil: any = {
        latitude,
        longitude,
        soil_type: mapSoilTypeToBackend(active.soilType) ?? undefined,
        ph,
        nitrogen,
        phosphorus,
        potassium,
        has_tractor: false,
        irrigation: false,
        easy_maintenance_preference: 3,
      };

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const resp = await fetch(`${base}/rotation/score-ml`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soil }),
      });
      const results = await resp.json();

      // Persist results for the recommendations page
      try {
        sessionStorage.setItem("cropz.rotationScores", JSON.stringify(results));
        sessionStorage.setItem(
          "cropz.rotationScores.meta",
          JSON.stringify({
            landId: active.id,
            landName: active.name,
            soilType: active.soilType,
            N: active.nitrogen,
            P: active.phosphorus,
            K: active.potassium,
            pH: active.pH,
            latitude,
            longitude,
          })
        );
      } catch {}

      router.push("/recommendations");
    } catch (e) {
      console.warn("Failed to get recommendations", e);
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="relative min-h-screen px-6 py-16 max-w-6xl mx-auto text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Main gradient orbs */}
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
          {[...Array(15)].map((_, i) => (
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-lime-500 to-green-600 bg-clip-text text-transparent mb-2">
              {`Welcome${name ? ", " + name.split(" ")[0] : "!"}`}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Manage your farm lands and get AI-powered crop recommendations
            </p>
          </div>
          
          <div className="group/btn">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-lime-500 rounded-2xl blur opacity-30 group-hover/btn:opacity-50 transition duration-300"></div>
            <button
              onClick={() => setCreateOpen(true)}
              className="relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <span className="text-xl">+</span>
              <span>Create New Land</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {lands.length === 0 ? (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative rounded-3xl border border-white/20 bg-white/80 dark:bg-neutral-900/80 p-12 text-center shadow-2xl backdrop-blur-xl">
              <div className="text-6xl mb-6 animate-bounce">🌱</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No Lands Yet</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                Create your first land to get started with AI-powered crop recommendations based on your soil data.
              </p>
              <div className="group/btn">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-lime-500 rounded-2xl blur opacity-30 group-hover/btn:opacity-50 transition duration-300"></div>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="relative px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Land Tabs */}
            <div className="flex flex-wrap gap-3">
              {lands.map((land, index) => (
                <button
                  key={land.id}
                  onClick={() => setActiveLandId(land.id)}
                  className={`group relative px-6 py-3 rounded-2xl border-2 font-medium transition-all duration-300 hover:scale-105 ${
                    land.id === activeLandId
                      ? "border-emerald-500 bg-gradient-to-r from-emerald-500 to-lime-500 text-white shadow-lg"
                      : "border-white/20 bg-white/50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-300 hover:border-emerald-300 hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:shadow-lg"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="relative z-10">{land.name}</span>
                  {land.id === activeLandId && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 opacity-20 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Land Details Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative rounded-3xl border border-white/20 bg-white dark:bg-neutral-900 p-8 shadow-2xl">
                {activeLandId ? (
                  (() => {
                    const active = lands.find((l) => l.id === activeLandId)!;
                    return (
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-6 mb-8">
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Selected Land</div>
                            <div className="text-3xl font-bold text-gray-800 dark:text-white">{active.name}</div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={openEditForActive} 
                              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={openDeleteForActive} 
                              className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>

                        {landStep === "overview" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Soil Texture Card */}
                            <div className="group/card p-6 rounded-2xl border border-white/20 bg-white/50 dark:bg-neutral-800/50 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-300 hover:scale-105">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                                  🌍
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">Soil Texture</div>
                                  <div className="text-xl font-semibold text-gray-800 dark:text-white">
                                    {active.soilType ?? "Unknown"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Soil Health Variables Card */}
                            <div className="group/card p-6 rounded-2xl border border-white/20 bg-white/50 dark:bg-neutral-800/50 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-300 hover:scale-105">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl">
                                  📊
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">Soil Health</div>
                                  <div className="text-xl font-semibold text-gray-800 dark:text-white">
                                    {active.nitrogen || active.phosphorus || active.potassium || active.pH ? "Configured" : "Not Set"}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div>N: {active.nitrogen || "Not set"}</div>
                                <div>P: {active.phosphorus || "Not set"}</div>
                                <div>K: {active.potassium || "Not set"}</div>
                                <div>pH: {active.pH || "Not set"}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Soil Health Variables</h3>
                              <p className="text-gray-600 dark:text-gray-300">Enter the nutrient levels for optimal crop recommendations</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Nitrogen (N)
                                </label>
                                <select
                                  value={tempNitrogen}
                                  onChange={(e) => setTempNitrogen(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  <option value="">Select nitrogen level...</option>
                                  <option value="0">0 - Very Low</option>
                                  <option value="1">1 - Low</option>
                                  <option value="2">2 - Medium</option>
                                  <option value="3">3 - High</option>
                                  <option value="4">4 - Very High</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Phosphorus (P)
                                </label>
                                <select
                                  value={tempPhosphorus}
                                  onChange={(e) => setTempPhosphorus(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  <option value="">Select phosphorus level...</option>
                                  <option value="0">0 - Very Low</option>
                                  <option value="1">1 - Low</option>
                                  <option value="2">2 - Medium</option>
                                  <option value="3">3 - High</option>
                                  <option value="4">4 - Very High</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Potassium (K)
                                </label>
                                <select
                                  value={tempPotassium}
                                  onChange={(e) => setTempPotassium(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  <option value="">Select potassium level...</option>
                                  <option value="0">0 - Very Low</option>
                                  <option value="1">1 - Low</option>
                                  <option value="2">2 - Medium</option>
                                  <option value="3">3 - High</option>
                                  <option value="4">4 - Very High</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  pH Level
                                </label>
                                <select
                                  value={tempPH}
                                  onChange={(e) => setTempPH(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  <option value="">Select pH level...</option>
                                  <option value="Acidic (5.0–5.9)">Acidic (5.0–5.9)</option>
                                  <option value="Neutral (6.0–7.3)">Neutral (6.0–7.3)</option>
                                  <option value="Alkaline (7.4–8.5)">Alkaline (7.4–8.5)</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-4 pt-6">
                              <button 
                                onClick={() => setLandStep("overview")} 
                                className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                ← Back
                              </button>
                              <button 
                                onClick={saveNutrientInputs} 
                                className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Save Variables
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Location Input Section */}
                        {landStep === "overview" && (
                          <div className="mt-8 space-y-6">
                            {/* Location Mode Selection */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                📍 Location Settings
                              </h3>
                              
                              {/* Mode Toggle */}
                              <div className="flex gap-4 mb-6">
                                <button
                                  onClick={() => setLocationMode("auto")}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    locationMode === "auto"
                                      ? "bg-emerald-600 text-white shadow-lg"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  🌍 Use Current Location
                                </button>
                                <button
                                  onClick={() => setLocationMode("manual")}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    locationMode === "manual"
                                      ? "bg-emerald-600 text-white shadow-lg"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  📝 Enter Coordinates
                                </button>
                              </div>

                              {/* Manual Input Fields */}
                              {locationMode === "manual" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Latitude
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={manualLatitude}
                                      onChange={(e) => setManualLatitude(e.target.value)}
                                      placeholder="e.g., 40.7128"
                                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Range: -90 to 90</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Longitude
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={manualLongitude}
                                      onChange={(e) => setManualLongitude(e.target.value)}
                                      placeholder="e.g., -74.0060"
                                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Range: -180 to 180</p>
                                  </div>
                                </div>
                              )}

                              {/* Auto Location Info */}
                              {locationMode === "auto" && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <span className="text-lg">🌍</span>
                                    <span className="font-medium">Automatic Location Detection</span>
                                  </div>
                                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                                    We'll use your current location for weather and soil data. Make sure location access is enabled in your browser.
                                  </p>
                                </div>
                              )}

                              {/* Error Message */}
                              {locationError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                    <span className="text-lg">⚠️</span>
                                    <span className="font-medium">Location Error</span>
                                  </div>
                                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{locationError}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                              <button
                                onClick={openNutrientInputs}
                                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                📊 Edit Soil Health Variables
                              </button>
                              
                              <button 
                                onClick={handleRecommend}
                                disabled={recommending}
                                className={`px-8 py-4 rounded-lg text-white font-semibold transition-all duration-300 ${
                                  recommending 
                                    ? "bg-emerald-400 cursor-not-allowed" 
                                    : "bg-emerald-600 hover:bg-emerald-700 hover:scale-105"
                                }`}
                              >
                                {recommending ? "Calculating..." : "🌱 Recommend Best Crops"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌱</div>
                    <div className="text-xl text-gray-600 dark:text-gray-300">Select a land to view details</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create new land" widthClassName="max-w-3xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Land name</label>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="e.g., North field"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div>
            <SoilTextureWizard onComplete={handleSaveSoil} />
          </div>
        </div>
      </Modal>

      {/* Edit land */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit land" widthClassName="max-w-3xl">
        {editLandId && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Land name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., North field"
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {"Current soil texture: "}
                <span className="font-medium">{lands.find((l) => l.id === editLandId)?.soilType ?? "Unknown"}</span>
                {editNewSoilType && (
                  <span className="ml-2 text-green-600 dark:text-green-400">→ {editNewSoilType} (pending)</span>
                )}
              </div>
              <SoilTextureWizard onComplete={handleEditWizardComplete} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-md border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-neutral-800">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">Save changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete land" widthClassName="max-w-md">
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">This action cannot be undone. The selected land will be removed.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-md border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-neutral-800">Cancel</button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

