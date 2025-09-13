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
  const [editOpen, setEditOpen] = useState(false);
  const [editLandId, setEditLandId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNewSoilType, setEditNewSoilType] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const handleSaveEdit = () => {
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
  };

  const openDeleteForActive = () => {
    if (!activeLandId) return;
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!activeLandId) return;
    const remaining = lands.filter((l) => l.id !== activeLandId);
    setLands(remaining);
    setActiveLandId(remaining.length ? remaining[0].id : null);
    setDeleteOpen(false);
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
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border p-4 border-black/10 dark:border-white/10">
                          <div className="text-sm text-gray-600 dark:text-gray-300">Soil texture</div>
                          <div className="text-lg font-medium">{active.soilType ?? "Unknown"}</div>
                        </div>
                        <div className="rounded-xl border p-4 border-black/10 dark:border-white/10">
                          <div className="text-sm text-gray-600 dark:text-gray-300">Next</div>
                          <div className="text-lg font-medium">Crop suggestions coming soon</div>
                        </div>
                      </div>
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

