"use client";
import { useEffect, useRef, useState } from "react";
import { auth, rtdb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref, set, update, remove } from "firebase/database";
import SoilTextureWizard, { SoilTextureWizardResult } from "@/components/SoilTextureWizard";
import Modal from "@/components/Modal";

type Land = {
  id: string;
  name: string;
  soilType?: string;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  pH?: number;
};

export default function Dashboard() {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeLandId) return;
    setLandStep("overview");
    const land = lands.find((l) => l.id === activeLandId);
    setTempNitrogen(land?.nitrogen !== undefined ? String(land.nitrogen) : "");
    setTempPhosphorus(land?.phosphorus !== undefined ? String(land.phosphorus) : "");
    setTempPotassium(land?.potassium !== undefined ? String(land.potassium) : "");
    setTempPH(land?.pH !== undefined ? String(land.pH) : "");
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
    const nitrogen = tempNitrogen.trim() === "" ? undefined : Number(tempNitrogen);
    const phosphorus = tempPhosphorus.trim() === "" ? undefined : Number(tempPhosphorus);
    const potassium = tempPotassium.trim() === "" ? undefined : Number(tempPotassium);
    const pH = tempPH.trim() === "" ? undefined : Number(tempPH);
    setLands((prev) =>
      prev.map((l) =>
        l.id === activeLandId
          ? {
              ...l,
              nitrogen: Number.isNaN(nitrogen as number) ? l.nitrogen : (nitrogen as number | undefined),
              phosphorus: Number.isNaN(phosphorus as number) ? l.phosphorus : (phosphorus as number | undefined),
              potassium: Number.isNaN(potassium as number) ? l.potassium : (potassium as number | undefined),
              pH: Number.isNaN(pH as number) ? l.pH : (pH as number | undefined),
            }
          : l
      )
    );
    setLandStep("overview");
    try {
      if (rtdb && uid) {
        const updates: Partial<Land> = {};
        if (!Number.isNaN(nitrogen as number) && nitrogen !== undefined) updates.nitrogen = nitrogen as number;
        if (!Number.isNaN(phosphorus as number) && phosphorus !== undefined) updates.phosphorus = phosphorus as number;
        if (!Number.isNaN(potassium as number) && potassium !== undefined) updates.potassium = potassium as number;
        if (!Number.isNaN(pH as number) && pH !== undefined) updates.pH = pH as number;
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

  return (
    <div className="min-h-screen px-6 py-16 max-w-5xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{`Welcome${name ? ", " + name.split(" ")[0] : "!"}`}</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-green-600 text-white px-5 py-2 hover:bg-green-700 transition"
        >
          + Create new land
        </button>
      </div>

      <div className="mt-6">
        {lands.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-gray-600 dark:text-gray-300">
            No lands yet. Create your first land to get soil-based crop suggestions.
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2">
              {lands.map((land) => (
                <button
                  key={land.id}
                  onClick={() => setActiveLandId(land.id)}
                  className={`px-4 py-2 rounded-full border transition ${
                    land.id === activeLandId
                      ? "bg-green-600 text-white border-green-600 shadow-sm"
                      : "bg-white text-gray-800 border-black/10 hover:bg-gray-50 dark:bg-neutral-900 dark:text-gray-100 dark:border-white/10 dark:hover:bg-neutral-800"
                  }`}
                >
                  {land.name}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border p-6 border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900">
              {activeLandId ? (
                (() => {
                  const active = lands.find((l) => l.id === activeLandId)!;
                  return (
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Selected land</div>
                          <div className="text-2xl font-semibold">{active.name}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={openEditForActive} className="px-3 py-2 rounded-md border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-neutral-800">Edit</button>
                          <button onClick={openDeleteForActive} className="px-3 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">Delete</button>
                        </div>
                      </div>

                      {landStep === "overview" ? (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-xl border p-4 border-black/10 dark:border-white/10">
                            <div className="text-sm text-gray-600 dark:text-gray-300">Soil texture</div>
                            <div className="text-lg font-medium">{active.soilType ?? "Unknown"}</div>
                          </div>
                          <button
                            onClick={openNutrientInputs}
                            className="text-left rounded-xl border p-4 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                          >
                            <div className="text-sm text-gray-600 dark:text-gray-300">Next</div>
                            <div className="text-lg font-medium">Enter soil health variables</div>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">Soil health variables</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nitrogen</label>
                              <input
                                type="number"
                                value={tempNitrogen}
                                onChange={(e) => setTempNitrogen(e.target.value)}
                                placeholder="e.g., 50"
                                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phosphorus</label>
                              <input
                                type="number"
                                value={tempPhosphorus}
                                onChange={(e) => setTempPhosphorus(e.target.value)}
                                placeholder="e.g., 30"
                                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Potassium</label>
                              <input
                                type="number"
                                value={tempPotassium}
                                onChange={(e) => setTempPotassium(e.target.value)}
                                placeholder="e.g., 40"
                                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">pH</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="14"
                                value={tempPH}
                                onChange={(e) => setTempPH(e.target.value)}
                                placeholder="e.g., 6.5"
                                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-black/10 dark:border-white/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end gap-3">
                            <button onClick={() => setLandStep("overview")} className="px-4 py-2 rounded-md border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-neutral-800">Back</button>
                            <button onClick={saveNutrientInputs} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-gray-600 dark:text-gray-300">Select a land to view details.</div>
              )}
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

