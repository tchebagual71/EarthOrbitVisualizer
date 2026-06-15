"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import { LAUNCH_SITES, getLaunchSiteScenePos, SITE_TYPE_COLOR, SITE_TYPE_LABEL } from "@/lib/launchsites";
import { CATEGORY_MAP } from "@/lib/categories";
import type { SatelliteRecord } from "@/types/satellite";
import type { LaunchSite } from "@/lib/launchsites";

const MAX_RESULTS = 10;

type ResultItem =
  | { kind: "sat";  sat: SatelliteRecord; score: number }
  | { kind: "site"; site: LaunchSite;     score: number };

function satScore(sat: SatelliteRecord, q: string): number {
  const name  = sat.name.toLowerCase();
  const norad = String(sat.noradId);
  if (name === q || norad === q)   return 100;
  if (name.startsWith(q))          return  80;
  if (norad.startsWith(q))         return  70;
  if (name.includes(q))            return  50;
  return 0;
}

function siteScore(site: LaunchSite, q: string): number {
  const name    = site.name.toLowerCase();
  const short   = site.shortName.toLowerCase();
  const country = site.country.toLowerCase();
  const agency  = site.agency.toLowerCase();
  if (short === q || name === q)       return 100;
  if (short.startsWith(q))             return  90;
  if (name.startsWith(q))              return  80;
  if (short.includes(q))               return  70;
  if (name.includes(q))                return  60;
  if (country.includes(q) || agency.includes(q)) return 40;
  return 0;
}

export function SearchPanel() {
  const showSearch = useStore((s) => s.showSearch);
  const setShowSearch = useStore((s) => s.setShowSearch);
  const setSelectedSat = useStore((s) => s.setSelectedSat);
  const setJumpTarget = useStore((s) => s.setJumpTarget);
  const setJumpPosition = useStore((s) => s.setJumpPosition);
  const enabledCategories = useStore((s) => s.enabledCategories);
  const { satellites } = useAllTLEData(enabledCategories);
  const [query, setQuery]     = useState("");
  const [cursor, setCursor]   = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) {
      setQuery("");
      setCursor(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSearch]);

  const q = query.trim().toLowerCase();

  const results = useMemo<ResultItem[]>(() => {
    if (!q) return [];
    return [
      ...satellites.map((sat) => ({ kind: "sat" as const, sat, score: satScore(sat, q) })).filter(({ score }) => score > 0),
      ...LAUNCH_SITES.map((site) => ({ kind: "site" as const, site, score: siteScore(site, q) })).filter(({ score }) => score > 0),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }, [q, satellites]);

  const handleSelectSat = useCallback((sat: SatelliteRecord) => {
    setSelectedSat(sat);
    setJumpTarget(sat);
    setShowSearch(false);
  }, [setSelectedSat, setJumpTarget, setShowSearch]);

  const handleSelectSite = useCallback((site: LaunchSite) => {
    const pos = getLaunchSiteScenePos(site);
    setJumpPosition(pos);
    setShowSearch(false);
  }, [setJumpPosition, setShowSearch]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown")  { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && cursor >= 0) {
      const item = results[cursor];
      if (item.kind === "sat")  handleSelectSat(item.sat);
      if (item.kind === "site") handleSelectSite(item.site);
    }
  }, [cursor, results, handleSelectSat, handleSelectSite]);

  if (!showSearch) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40" onClick={() => setShowSearch(false)} />

      {/* Panel */}
      <div
        className="absolute z-50 rounded-xl bg-slate-900/97 backdrop-blur-md border border-slate-700/60 shadow-2xl overflow-hidden"
        style={{ top: "1.5rem", left: "50%", transform: "translateX(-50%)", width: "min(92vw, 440px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <span className="text-slate-400 text-sm select-none">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(-1); }}
            onKeyDown={handleKey}
            placeholder="Satellite name, NORAD ID, or launch site…"
            // text-base (16px) prevents iOS from auto-zooming on focus
            className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-base outline-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery("")} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:text-white transition-colors text-lg" aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
            {results.map((item, i) => {
              const active = i === cursor;
              if (item.kind === "sat") {
                const { sat } = item;
                const cat = CATEGORY_MAP[sat.category];
                return (
                  <li key={`sat-${sat.id}`}>
                    <button
                      onClick={() => handleSelectSat(sat)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        active ? "bg-slate-700/70" : "hover:bg-slate-800/60 active:bg-slate-700/60"
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: cat?.color ?? "#94a3b8" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{sat.name}</div>
                        <div className="text-slate-500 text-xs">
                          NORAD #{sat.noradId} · {sat.category.toUpperCase()} · {sat.altitude.toLocaleString()} km
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">satellite ↗</span>
                    </button>
                  </li>
                );
              }
              // launch site
              const { site } = item;
              const color = SITE_TYPE_COLOR[site.type];
              return (
                <li key={`site-${site.id}`}>
                  <button
                    onClick={() => handleSelectSite(site)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      active ? "bg-slate-700/70" : "hover:bg-slate-800/60 active:bg-slate-700/60"
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{site.name}</div>
                      <div className="text-slate-500 text-xs">
                        {site.country} · {SITE_TYPE_LABEL[site.type]} · est. {site.firstLaunch}
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">site ↗</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {q && results.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-500 text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!q && (
          <div className="px-4 py-4 space-y-2">
            <p className="text-xs text-slate-500">
              Search satellites by name or NORAD ID, or find any launch site by name, country, or agency.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["ISS", "Starlink", "GPS", "Promontory", "Baikonur", "Starbase"].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint)}
                  className="text-xs text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 rounded-md px-2 py-1 transition-colors border border-slate-700/40"
                >
                  {hint}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600">
              <kbd className="bg-slate-800 rounded px-1 font-mono">↑↓</kbd> navigate &nbsp;
              <kbd className="bg-slate-800 rounded px-1 font-mono">Enter</kbd> select &nbsp;
              <kbd className="bg-slate-800 rounded px-1 font-mono">Esc</kbd> close
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
