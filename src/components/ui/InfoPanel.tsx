"use client";
import { useStore } from "@/hooks/useStore";
import { classifyAltitude } from "@/lib/tle";
import { CATEGORY_MAP } from "@/lib/categories";

export function InfoPanel() {
  const { selectedSat, setSelectedSat, showOrbitPath, setShowOrbitPath } = useStore();

  if (!selectedSat) return null;

  const group = CATEGORY_MAP[selectedSat.category];
  const orbitClass = classifyAltitude(selectedSat.altitude);

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-64 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 text-sm shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-semibold text-white leading-tight">{selectedSat.name}</h2>
          <p className="text-slate-400 text-xs mt-0.5">NORAD #{selectedSat.noradId}</p>
        </div>
        <button
          onClick={() => setSelectedSat(null)}
          className="text-slate-500 hover:text-slate-200 text-lg leading-none -mt-0.5"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <Row label="Category">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: group?.color }}
            />
            {group?.label ?? selectedSat.category}
          </span>
        </Row>
        <Row label="Orbit Class">
          <span className="font-mono">{orbitClass}</span>
        </Row>
        <Row label="Altitude">
          <span className="font-mono">{selectedSat.altitude.toLocaleString()} km</span>
        </Row>
        <Row label="Inclination">
          <span className="font-mono">{selectedSat.inclination.toFixed(2)}°</span>
        </Row>
      </div>

      <button
        onClick={() => setShowOrbitPath(!showOrbitPath)}
        className="mt-4 w-full rounded-md bg-slate-700/60 hover:bg-slate-600/60 py-1.5 text-xs transition-colors text-slate-200"
      >
        {showOrbitPath ? "Hide" : "Show"} Orbital Path
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100">{children}</span>
    </div>
  );
}
