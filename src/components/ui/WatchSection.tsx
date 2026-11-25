"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import { useFlybys } from "@/hooks/useFlybys";
import { atmosphereWatch, ATMOSPHERE_WATCH_PERIGEE_KM, type AtmosphereWatchKind } from "@/lib/tle";
import { formatDiameter, formatLunarDistances, type Flyby } from "@/lib/flybys";
import { cn } from "@/lib/utils";

// Camera distances (scene units = 1,000 km)
export const DEEP_SPACE_ZOOM = 1600; // Moon's orbit comfortably in frame
export const HOME_ZOOM = 25;
const MAX_ROWS = 40;

const KIND_LABEL: Record<AtmosphereWatchKind, string> = {
  reentering: "reentering",
  decaying: "decaying",
  skimming: "skims past",
};

const KIND_CLASS: Record<AtmosphereWatchKind, string> = {
  reentering: "text-red-400",
  decaying: "text-orange-400",
  skimming: "text-yellow-300",
};

const utc = (ms: number, withTime = false): string =>
  new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "UTC",
  });

function Switch({ on, onToggle, label, color }: { on: boolean; onToggle: () => void; label: string; color: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      className={cn("w-7 h-4 rounded-full transition-colors relative cursor-pointer flex-shrink-0", on ? color : "bg-slate-700")}
    >
      <span className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow", on ? "translate-x-3.5" : "translate-x-0.5")} />
    </button>
  );
}

function FlybyRow({ flyby }: { flyby: Flyby }) {
  const selected = useStore((s) => s.selectedFlyby === flyby.des);
  const setSelectedFlyby = useStore((s) => s.setSelectedFlyby);
  const requestZoom = useStore((s) => s.requestZoom);
  const setSimTime = useStore((s) => s.setSimTime);
  const setPlaying = useStore((s) => s.setPlaying);

  return (
    <div className={cn("rounded-md", selected ? "bg-slate-800/80" : "hover:bg-slate-800/40")}>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          setSelectedFlyby(selected ? null : flyby.des);
          // Frame the whole pass: a bit more than twice the miss distance
          if (!selected) requestZoom(Math.min(14000, Math.max(900, (flyby.distKm / 1000) * 2.4)));
        }}
        aria-pressed={selected}
        className="flex w-full items-center gap-2 px-2 min-h-[36px] text-left text-xs"
      >
        <span className={cn("flex-1 truncate", selected ? "text-yellow-200" : "text-slate-200")}>{flyby.name}</span>
        <span className="text-[10px] tabular-nums text-slate-500 flex-shrink-0">
          {flyby.caTimeMs < Date.now() ? "passed " : ""}{utc(flyby.caTimeMs)}
        </span>
        <span className="text-[10px] tabular-nums text-amber-400 w-11 text-right flex-shrink-0">
          {formatLunarDistances(flyby.distKm)}
        </span>
      </button>
      {selected && (
        <div className="px-2 pb-2 text-[10px] text-slate-400 space-y-0.5">
          <p>Closest {utc(flyby.caTimeMs, true)} UTC</p>
          <p>
            {Math.round(flyby.distKm).toLocaleString()} km from Earth · {flyby.vRelKms.toFixed(1)} km/s · {formatDiameter(flyby.diameterM)} across
          </p>
          {!flyby.path && <p className="text-slate-600">Trajectory unavailable</p>}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setSimTime(new Date(flyby.caTimeMs - 6 * 3600_000));
              setPlaying(false);
            }}
            className="mt-1 rounded bg-slate-700/70 px-2 py-1.5 text-slate-200 hover:bg-slate-600/70 transition-colors"
          >
            ⏱ Set clock to 6 h before closest approach
          </button>
        </div>
      )}
    </div>
  );
}

// "What is coming down, and what is passing by": tracked objects whose orbit
// reaches into the atmosphere, and asteroids making close approaches.
export function WatchSection() {
  const enabledCategories = useStore((s) => s.enabledCategories);
  const showReentryWatch = useStore((s) => s.showReentryWatch);
  const setShowReentryWatch = useStore((s) => s.setShowReentryWatch);
  const showFlybys = useStore((s) => s.showFlybys);
  const setShowFlybys = useStore((s) => s.setShowFlybys);
  const setSelectedSat = useStore((s) => s.setSelectedSat);
  const setJumpTarget = useStore((s) => s.setJumpTarget);
  const selectedSatId = useStore((s) => s.selectedSat?.noradId ?? null);
  const requestZoom = useStore((s) => s.requestZoom);
  const [open, setOpen] = useState(true);

  const { satellites } = useAllTLEData(enabledCategories);
  const watch = useMemo(
    () => (showReentryWatch ? atmosphereWatch(satellites) : []),
    [showReentryWatch, satellites]
  );
  const { flybys, isLoading, error, retry } = useFlybys(showFlybys);

  return (
    <div className="border-t border-slate-700/50 px-3 py-2">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center justify-between w-full mb-1.5 group"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
          Incoming
        </span>
        <span className="text-slate-600 text-xs">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="space-y-2">
          {/* Atmosphere watch */}
          <div>
            <div className="flex items-center gap-2 px-2 min-h-[32px]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
              <span className="flex-1 text-xs text-slate-200">
                Entering the atmosphere
                {showReentryWatch && <span className="text-slate-500 tabular-nums"> ({watch.length})</span>}
              </span>
              <Switch
                on={showReentryWatch}
                onToggle={() => setShowReentryWatch(!showReentryWatch)}
                label="Highlight objects that dip into the atmosphere"
                color="bg-red-500"
              />
            </div>
            {showReentryWatch && (
              <>
                <p className="px-2 pb-1 text-[10px] leading-snug text-slate-500">
                  Tracked objects whose orbit drops below {ATMOSPHERE_WATCH_PERIGEE_KM} km, lowest first. Shown in red.
                </p>
                <div className="max-h-44 overflow-y-auto scrollbar-thin space-y-0.5">
                  {watch.slice(0, MAX_ROWS).map(({ sat, perigeeKm, kind }) => (
                    <button
                      key={sat.noradId}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => { setSelectedSat(sat); setJumpTarget(sat); }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 min-h-[36px] text-left text-xs",
                        selectedSatId === sat.noradId ? "bg-slate-800/80" : "hover:bg-slate-800/40"
                      )}
                    >
                      <span className="flex-1 truncate text-slate-200">{sat.name}</span>
                      <span className={cn("text-[10px] flex-shrink-0", KIND_CLASS[kind])}>{KIND_LABEL[kind]}</span>
                      <span className="text-[10px] tabular-nums text-slate-400 w-12 text-right flex-shrink-0">
                        {Math.round(perigeeKm)} km
                      </span>
                    </button>
                  ))}
                  {watch.length === 0 && (
                    <p className="px-2 py-1 text-[10px] text-slate-600">Nothing that low in the loaded categories.</p>
                  )}
                  {watch.length > MAX_ROWS && (
                    <p className="px-2 py-1 text-[10px] text-slate-600">+ {watch.length - MAX_ROWS} more, all highlighted</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Asteroid flybys */}
          <div>
            <div className="flex items-center gap-2 px-2 min-h-[32px]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
              <span className="flex-1 text-xs text-slate-200">
                Asteroid flybys
                {showFlybys && !isLoading && !error && <span className="text-slate-500 tabular-nums"> ({flybys.length})</span>}
              </span>
              <Switch
                on={showFlybys}
                onToggle={() => {
                  setShowFlybys(!showFlybys);
                  requestZoom(showFlybys ? HOME_ZOOM : DEEP_SPACE_ZOOM);
                }}
                label="Show asteroids passing the Earth"
                color="bg-amber-500"
              />
            </div>
            {showFlybys && (
              <>
                <p className="px-2 pb-1 text-[10px] leading-snug text-slate-500">
                  Closest passes within ~19 lunar distances (LD), 60 days ahead. Data: NASA/JPL.
                </p>
                <div className="flex gap-1 px-2 pb-1">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => requestZoom(DEEP_SPACE_ZOOM)}
                    className="flex-1 rounded bg-slate-700/70 py-1.5 text-[10px] text-slate-200 hover:bg-slate-600/70 transition-colors"
                  >
                    Zoom out
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => requestZoom(HOME_ZOOM)}
                    className="flex-1 rounded bg-slate-700/70 py-1.5 text-[10px] text-slate-200 hover:bg-slate-600/70 transition-colors"
                  >
                    Back to Earth
                  </button>
                </div>
                {isLoading && <p className="px-2 py-1 text-[10px] text-blue-400 animate-pulse">loading from JPL…</p>}
                {error && !isLoading && (
                  <button onClick={retry} className="px-2 py-1 text-[10px] text-red-400 hover:text-red-200 text-left">
                    ⚠ couldn&apos;t load flyby data — tap to retry
                  </button>
                )}
                <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-0.5">
                  {flybys.map((f) => <FlybyRow key={`${f.des}-${f.caTimeMs}`} flyby={f} />)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
