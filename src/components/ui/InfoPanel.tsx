"use client";
import { useMemo } from "react";
import * as satellite from "satellite.js";
import { useStore } from "@/hooks/useStore";
import { classifyAltitude, classifyOrbit, getTLEAgeHours, orbitApsides, orbitalPeriodMin } from "@/lib/tle";
import { getLiveState } from "@/lib/coordinates";
import { CATEGORY_MAP } from "@/lib/categories";

function formatPeriod(min: number): string {
  if (min >= 60) return `${(min / 60).toFixed(1)} h`;
  return `${Math.round(min)} min`;
}

function formatLatLon(latDeg: number, lonDeg: number): string {
  const lat = `${Math.abs(latDeg).toFixed(1)}°${latDeg > -0.05 ? "N" : "S"}`;
  const lon = `${Math.abs(lonDeg).toFixed(1)}°${lonDeg > -0.05 ? "E" : "W"}`;
  return `${lat} ${lon}`;
}

const km = (v: number): string => Math.round(v).toLocaleString();

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
  const followSat = useStore((s) => s.followSat);
  const setFollowSat = useStore((s) => s.setFollowSat);
  const simTime = useStore((s) => s.simTime);

  // Parsed once per selection; mean-element quantities don't change with time
  const orbit = useMemo(() => {
    if (!selectedSat) return null;
    try {
      const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
      const periodMin = orbitalPeriodMin(satrec.no);
      if (!Number.isFinite(periodMin)) return null;
      return { satrec, periodMin, orbitClass: classifyOrbit(satrec), ...orbitApsides(satrec) };
    } catch {
      return null;
    }
  }, [selectedSat]);

  // Re-propagated whenever the published sim clock ticks (about once a second)
  const live = useMemo(
    () => (orbit ? getLiveState(orbit.satrec, simTime) : null),
    [orbit, simTime]
  );

  if (!selectedSat) return null;

  const group =CATEGORY_MAP[selectedSat.category];
  // Mean-element classification when available; altitude snapshot as fallback
  const orbitClass = orbit?.orbitClass ?? classifyAltitude(selectedSat.altitude);
  const age = formatAge(getTLEAgeHours(selectedSat.line1, simTime));

  return (
    <div className="info-panel scrollbar-thin absolute z-20 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 text-sm shadow-2xl">
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
          <span className="font-mono tabular-nums">{km(live?.altitudeKm ?? selectedSat.altitude)} km</span>
        </Row>
        {live && (
          <>
            <Row label="Speed">
              <span className="font-mono tabular-nums">{live.speedKms.toFixed(2)} km/s</span>
            </Row>
            <Row label="Over">
              <span className="font-mono tabular-nums">{formatLatLon(live.latDeg, live.lonDeg)}</span>
            </Row>
          </>
        )}
        {orbit && (
          <>
            <Row label="Perigee">
              <span className="font-mono">{km(orbit.perigeeKm)} km</span>
            </Row>
            <Row label="Apogee">
              <span className="font-mono">{km(orbit.apogeeKm)} km</span>
            </Row>
          </>
        )}
        <Row label="Inclination">
          <span className="font-mono">{selectedSat.inclination.toFixed(2)}°</span>
        </Row>
        {orbit && (
          <Row label="Period">
            <span className="font-mono">{formatPeriod(orbit.periodMin)}</span>
          </Row>
        )}
      </div>

      {/* TLE age badge */}
      <div className={`mt-3 flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5 ${age.warn ? "bg-amber-900/40 text-amber-300" : "bg-slate-800/60 text-slate-400"}`}>
        <span>{age.warn ? "⚠" : "📡"}</span>
        <span>TLE data {age.text}</span>
        {age.warn && <span className="text-amber-400 font-semibold">· accuracy reduced</span>}
      </div>

      {/* Follow camera */}
      <button
        onClick={() => setFollowSat(!followSat)}
        aria-pressed={followSat}
        className={`mt-3 w-full rounded-md py-2 text-xs transition-colors min-h-[40px] ${followSat ? "bg-emerald-600/70 hover:bg-emerald-500/70 text-white" : "bg-slate-700/60 hover:bg-slate-600/60 text-slate-300"}`}
        title="Ride along with this satellite; drag and zoom still work"
      >
        {followSat ? "✓ Following — tap to release" : "Follow with camera"}
      </button>

      {/* Toggles */}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
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
