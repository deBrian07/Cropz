"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import SoilTextureWizard, { SoilTextureWizardResult } from "@/components/SoilTextureWizard";
import Modal from "@/components/Modal";

export default function Dashboard() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lands, setLands] = useState<{ id: string; name: string; soilType?: string }[]>([]);
  const [activeLandId, setActiveLandId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tempName, setTempName] = useState("");

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

  const handleSaveSoil = (result: SoilTextureWizardResult) => {
    const id = crypto.randomUUID();
    const displayName = tempName.trim() || `Land ${lands.length + 1}`;
    const newLand = { id, name: displayName, soilType: result.texture };
    setLands((prev) => [...prev, newLand]);
    setActiveLandId(id);
    setTempName("");
    setCreateOpen(false);
  };

  return (
    <div className="min-h-screen px-6 py-16 max-w-5xl mx-auto">
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
          <div className="rounded-2xl border border-dashed p-10 text-center text-gray-600">
            No lands yet. Create your first land to get soil-based crop suggestions.
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2">
              {lands.map((land) => (
                <button
                  key={land.id}
                  onClick={() => setActiveLandId(land.id)}
                  className={`px-4 py-2 rounded-full border ${
                    land.id === activeLandId
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {land.name}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border p-6">
              {activeLandId ? (
                (() => {
                  const active = lands.find((l) => l.id === activeLandId)!;
                  return (
                    <div>
                      <div className="text-sm text-gray-500">Selected land</div>
                      <div className="text-2xl font-semibold">{active.name}</div>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border p-4">
                          <div className="text-sm text-gray-600">Soil texture</div>
                          <div className="text-lg font-medium">{active.soilType ?? "Unknown"}</div>
                        </div>
                        <div className="rounded-xl border p-4">
                          <div className="text-sm text-gray-600">Next</div>
                          <div className="text-lg font-medium">Crop suggestions coming soon</div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-gray-600">Select a land to view details.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create new land" widthClassName="max-w-3xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Land name</label>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="e.g., North field"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="rounded-xl border p-4 bg-gray-50">
            <div className="text-sm text-gray-700 mb-2">Soil texture assessment</div>
            <SoilTextureWizard onComplete={handleSaveSoil} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

