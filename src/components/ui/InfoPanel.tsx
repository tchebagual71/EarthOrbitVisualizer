"use client";
import { useMemo } from "react";
import * as satellite from "satellite.js";
import { useStore } from "@/hooks/useStore";
import { classifyAltitude, classifyOrbit, getTLEAgeHours, orbitalPeriodMin, orbitalVelocityKms } from "@/lib/tle";
import { CATEGORY_MAP } from "@/lib/categories";

function formatPeriod(min: number): string {
  if (min >= 60) return `${(min / 60).toFixed(1)} h`;
  return `${Math.round(min)} min`;
}

function formatAge(hours: number): { text: string; warn: boolean } {
  if (hours < 1) return { text: "< 1 h old", warn: false };
  if (hours < 24) return { text: `${Math.round(hours)} h old`, warn: false };
  const days = Math.round(hours / 24);
  return { text: `${days} d old`, warn: days > 7 };
}

export function InfoPanel() {
  const selectedSat = useStore((s) => s.selectedSat);
  const setSelectedSat = useStore((s) => s.setSelectedSat);
  const showOrbitPath = useStore((s) => s.showOrbitPath);
  const setShowOrbitPath = useStore((s) => s.setShowOrbitPath);
  const showGroundTrack = useStore((s) => s.showGroundTrack);
  const setShowGroundTrack = useStore((s) => s.setShowGroundTrack);
  const showSatTrail = useStore((s) => s.showSatTrail);
  const setShowSatTrail = useStore((s) => s.setShowSatTrail);
  const simTime = useStore((s) => s.simTime);

  const derived = useMemo(() => {
    if (!selectedSat) return null;
    try {
      const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
      const periodMin = orbitalPeriodMin(satrec.no);
      const velocity = orbitalVelocityKms(selectedSat.altitude);
      const ageHours = getTLEAgeHours(selectedSat.line1, simTime);
      return { periodMin, velocity, ageHours, orbitClass: classifyOrbit(satrec) };
    } catch {
      return null;
    }
  }, [selectedSat, simTime]);

  if (!selectedSat) return null;

  const group = CATEGORY_MAP[selectedSat.category];
  // Mean-element classification when available; altitude snapshot as fallback
  const orbitClass = derived?.orbitClass ?? classifyAltitude(selectedSat.altitude);
  const age = derived ? formatAge(derived.ageHours) : null;

  return (
    <div className="info-panel absolute z-20 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 text-sm shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-2">
          <h2 className="font-semibold text-white leading-tight">{selectedSat.name}</h2>
          <p className="text-slate-400 text-xs mt-0.5">NORAD #{selectedSat.noradId}</p>
        </div>
        <button
          onClick={() => setSelectedSat(null)}
          className="flex h-11 w-11 -mt-1 -mr-1 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 transition-colors text-lg"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <Row label="Category">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: group?.color }} />
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
        {derived && (
          <>
            <Row label="Period">
              <span className="font-mono">{formatPeriod(derived.periodMin)}</span>
            </Row>
            <Row label="Velocity">
              <span className="font-mono">{derived.velocity.toFixed(2)} km/s</span>
            </Row>
          </>
        )}
      </div>

      {/* TLE age badge */}
      {age && (
        <div className={`mt-3 flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5 ${age.warn ? "bg-amber-900/40 text-amber-300" : "bg-slate-800/60 text-slate-400"}`}>
          <span>{age.warn ? "⚠" : "📡"}</span>
          <span>TLE data {age.text}</span>
          {age.warn && <span className="text-amber-400 font-semibold">· accuracy reduced</span>}
        </div>
      )}

      {/* Toggles */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setShowSatTrail(!showSatTrail)}
          className={`rounded-md py-2 text-xs transition-colors min-h-[40px] ${showSatTrail ? "bg-purple-600/70 hover:bg-purple-500/70 text-white" : "bg-slate-700/60 hover:bg-slate-600/60 text-slate-400"}`}
          title="30-minute history trail"
        >
          {showSatTrail ? "✓ " : ""}Trail
        </button>
        <button
          onClick={() => setShowOrbitPath(!showOrbitPath)}
          className={`rounded-md py-2 text-xs transition-colors min-h-[40px] ${showOrbitPath ? "bg-blue-600/70 hover:bg-blue-500/70 text-white" : "bg-slate-700/60 hover:bg-slate-600/60 text-slate-400"}`}
          title="Full orbital path"
        >
          {showOrbitPath ? "✓ " : ""}Orbit
        </button>
        <button
          onClick={() => setShowGroundTrack(!showGroundTrack)}
          className={`rounded-md py-2 text-xs transition-colors min-h-[40px] ${showGroundTrack ? "bg-yellow-600/70 hover:bg-yellow-500/70 text-white" : "bg-slate-700/60 hover:bg-slate-600/60 text-slate-400"}`}
          title="Ground track on Earth surface"
        >
          {showGroundTrack ? "✓ " : ""}Track
        </button>
      </div>
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
