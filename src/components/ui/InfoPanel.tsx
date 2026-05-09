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
    <div className="info-panel absolute z-20 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 text-sm shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-semibold text-white leading-tight">{selectedSat.name}</h2>
          <p className="text-slate-400 text-xs mt-0.5">NORAD #{selectedSat.noradId}</p>
        </div>
        {/* 44×44 touch target for dismiss */}
        <button
          onClick={() => setSelectedSat(null)}
          className="flex h-11 w-11 -mt-1 -mr-1 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 transition-colors text-lg"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <Row label="Category">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
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
        className="mt-4 w-full rounded-md bg-slate-700/60 hover:bg-slate-600/60 active:bg-slate-500/60 py-2.5 text-xs transition-colors text-slate-200 min-h-[44px]"
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
