"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import type { SatelliteRecord } from "@/types/satellite";
import { CATEGORY_MAP } from "@/lib/categories";

const MAX_RESULTS = 8;

function matchScore(sat: SatelliteRecord, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = sat.name.toLowerCase();
  const norad = String(sat.noradId);
  if (name === q || norad === q) return 100;
  if (name.startsWith(q)) return 80;
  if (norad.startsWith(q)) return 70;
  if (name.includes(q)) return 50;
  return 0;
}

export function SearchPanel() {
  const { showSearch, setShowSearch, setSelectedSat, setJumpTarget, enabledCategories } = useStore();
  const { satellites } = useAllTLEData(enabledCategories);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSearch]);

  if (!showSearch) return null;

  const results: SatelliteRecord[] = query.trim()
    ? satellites
        .map((s) => ({ sat: s, score: matchScore(s, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS)
        .map(({ sat }) => sat)
    : [];

  const handleSelect = (sat: SatelliteRecord) => {
    setSelectedSat(sat);
    setJumpTarget(sat);
    setShowSearch(false);
    setQuery("");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40"
        onClick={() => setShowSearch(false)}
      />

      {/* Panel */}
      <div
        className="absolute z-50 rounded-xl bg-slate-900/97 backdrop-blur-md border border-slate-700/60 shadow-2xl overflow-hidden"
        style={{
          top: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(92vw, 420px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
          <span className="text-slate-400 text-base select-none">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Satellite name or NORAD ID…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-slate-500 hover:text-slate-200 transition-colors text-lg px-1"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {results.map((sat) => {
              const cat = CATEGORY_MAP[sat.category];
              return (
                <li key={sat.id}>
                  <button
                    onClick={() => handleSelect(sat)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 active:bg-slate-700/60 transition-colors"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: cat?.color ?? "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{sat.name}</div>
                      <div className="text-slate-500 text-xs">
                        NORAD #{sat.noradId} · {sat.category.toUpperCase()} · {sat.altitude.toLocaleString()} km
                      </div>
                    </div>
                    <span className="text-slate-600 text-xs">↗</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-500 text-sm">
            No satellites found for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-4 text-xs text-slate-500 space-y-1">
            <p>Search by name (e.g. &ldquo;ISS&rdquo;, &ldquo;Starlink&rdquo;) or NORAD ID</p>
            <p>Press <kbd className="bg-slate-800 rounded px-1 py-0.5 font-mono">Esc</kbd> to close</p>
          </div>
        )}
      </div>
    </>
  );
}
