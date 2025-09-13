"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type SoilType = "sandy" | "clay" | "silt" | "peat" | "chalk" | "loam";

type ScoredCrop = {
  crop: string;
  match_pct: number;
  rotation_group: "legumes" | "root_veggies" | "greens_brassicas" | "fruiting";
};

export default function Dashboard() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    soil_type: "loam" as SoilType,
    ph: 6.5,
    nitrogen: 2,
    phosphorus: 2,
    potassium: 2,
    has_tractor: false,
    irrigation: false,
    easy_maintenance_preference: 3,
  });
  const [results, setResults] = useState<ScoredCrop[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setResults(null);
    try {
      const res = await fetch("http://127.0.0.1:8001/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as ScoredCrop[];
      setResults(data.slice(0, 12));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold">Welcome{uid ? "!" : " to Cropz"}</h1>
      <p className="text-gray-600 mt-2">
        Answer a few questions. We’ll match crops to your conditions.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-700">Soil type</span>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.soil_type}
              onChange={(e) => setForm({ ...form, soil_type: e.target.value as SoilType })}
            >
              {(["sandy","clay","silt","peat","chalk","loam"] as SoilType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">pH</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={14}
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.ph}
              onChange={(e) => setForm({ ...form, ph: parseFloat(e.target.value) })}
            />
          </label>

          {(["nitrogen","phosphorus","potassium"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-sm text-gray-700 capitalize">{k} (0-5)</span>
              <input
                type="range"
                min={0}
                max={5}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: parseInt(e.target.value, 10) })}
                className="mt-2 w-full"
              />
              <span className="text-sm text-gray-600">{form[k]}</span>
            </label>
          ))}

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.has_tractor}
                onChange={(e) => setForm({ ...form, has_tractor: e.target.checked })}
              />
              <span>Tractor available</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.irrigation}
                onChange={(e) => setForm({ ...form, irrigation: e.target.checked })}
              />
              <span>Irrigation available</span>
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-700">Easy maintenance preference (1-5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={form.easy_maintenance_preference}
              onChange={(e) => setForm({ ...form, easy_maintenance_preference: parseInt(e.target.value, 10) })}
              className="mt-2 w-full"
            />
            <span className="text-sm text-gray-600">{form.easy_maintenance_preference}</span>
          </label>

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 w-full sm:w-auto rounded-md bg-green-600 text-white px-5 py-2 hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Scoring…" : "Score crops"}
          </button>
        </div>

        <div>
          {!results && (
            <div className="text-gray-500 border border-dashed rounded-lg p-6">
              Results will appear here.
            </div>
          )}
          {results && (
            <ul className="divide-y rounded-lg border">
              {results.map((r) => (
                <li key={r.crop} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">{r.crop}</div>
                    <div className="text-xs text-gray-500">{r.rotation_group.replace("_", " ")}</div>
                  </div>
                  <div className="text-green-700 font-semibold">{r.match_pct}%</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


