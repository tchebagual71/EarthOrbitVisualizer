"use client";
import { useRef, useState, useCallback } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import {
  SITE_TYPE_COLOR,
  SITE_TYPE_LABEL,
  LAUNCH_SITES,
  type LaunchSiteType,
} from "@/lib/launchsites";
import { cn } from "@/lib/utils";

const SITE_TYPES: LaunchSiteType[] = ["gov", "commercial", "test", "planned", "historical"];

// Count sites per type
const SITE_COUNTS = SITE_TYPES.reduce<Record<string, number>>((acc, t) => {
  acc[t] = LAUNCH_SITES.filter((s) => s.type === t).length;
  return acc;
}, {});

export function ControlPanel() {
  const {
    enabledCategories,
    showLaunchSites, setShowLaunchSites,
    enabledSiteTypes, toggleSiteType,
    setShowSearch,
  } = useStore();
  const { satellites, isLoading } = useAllTLEData(enabledCategories);
  const [collapsed, setCollapsed] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragOrigin = useRef<{
    clientX: number; clientY: number; panelX: number; panelY: number;
  } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOrigin.current = { clientX: e.clientX, clientY: e.clientY, panelX: rect.left, panelY: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    setPos({
      x: dragOrigin.current.panelX + (e.clientX - dragOrigin.current.clientX),
      y: dragOrigin.current.panelY + (e.clientY - dragOrigin.current.clientY),
    });
  }, []);

  const onPointerUp = useCallback(() => { dragOrigin.current = null; }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute z-20 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-xl text-white text-lg transition-colors hover:bg-slate-800/90 active:scale-95"
        style={{ left: "calc(env(safe-area-inset-left, 0px) + 1rem)", top: "50%", transform: "translateY(-50%)" }}
        aria-label="Open controls"
      >
        ☰
      </button>
    );
  }

  const panelStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y }
    : { marginLeft: "env(safe-area-inset-left, 0px)" };

  const panelClass = pos
    ? "z-20 w-56 rounded-xl bg-slate-900/92 backdrop-blur-md border border-slate-700/50 shadow-2xl overflow-hidden"
    : "absolute left-4 top-1/2 -translate-y-1/2 z-20 w-56 rounded-xl bg-slate-900/92 backdrop-blur-md border border-slate-700/50 shadow-2xl overflow-hidden";

  return (
    <div ref={panelRef} style={panelStyle} className={panelClass}>
      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between px-4 pt-4 pb-2 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <h1 className="text-base font-bold text-white tracking-tight">Earth Orbit</h1>
        <div className="flex items-center gap-1">
          {/* Search shortcut */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowSearch(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-xs"
            title="Search satellites or launch sites  ( / )"
          >
            🔍
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-sm"
            aria-label="Collapse panel"
          >
            ‹
          </button>
        </div>
      </div>

      {/* Satellite count */}
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-xs text-slate-500">
          {isLoading
            ? <span className="text-blue-400 animate-pulse">loading TLE data…</span>
            : <><span className="text-slate-200 font-semibold tabular-nums">{satellites.length.toLocaleString()}</span> objects tracked</>
          }
        </span>
      </div>

      {/* Satellite categories */}
      <div className="px-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-1">
          Satellites
        </p>
        <CategoryFilter />
      </div>

      {/* Launch sites section */}
      <div className="border-t border-slate-700/50 px-3 py-2">
        {/* Section header with master toggle */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setSitesOpen((o) => !o)}
          className="flex items-center justify-between w-full mb-1.5 group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
              Launch Sites
            </span>
            <span className="text-[10px] text-slate-600 tabular-nums">
              ({LAUNCH_SITES.filter((s) => enabledSiteTypes.has(s.type)).length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Master on/off */}
            <span
              role="checkbox"
              aria-checked={showLaunchSites}
              onClick={(e) => { e.stopPropagation(); setShowLaunchSites(!showLaunchSites); }}
              className={cn(
                "w-7 h-4 rounded-full transition-colors relative cursor-pointer",
                showLaunchSites ? "bg-amber-500" : "bg-slate-700"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow",
                showLaunchSites ? "translate-x-3.5" : "translate-x-0.5"
              )} />
            </span>
            <span className="text-slate-600 text-xs">{sitesOpen ? "▾" : "▸"}</span>
          </div>
        </button>

        {sitesOpen && showLaunchSites && (
          <div className="space-y-0.5">
            {SITE_TYPES.map((type) => {
              const color = SITE_TYPE_COLOR[type];
              const label = SITE_TYPE_LABEL[type];
              const count = SITE_COUNTS[type];
              const enabled = enabledSiteTypes.has(type);
              return (
                <button
                  key={type}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggleSiteType(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 min-h-[36px] text-xs w-full text-left transition-colors",
                    enabled
                      ? "bg-slate-800/50 text-slate-200"
                      : "text-slate-600 hover:bg-slate-800/30 hover:text-slate-400"
                  )}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: enabled ? color : "#334155" }}
                  />
                  <span className="flex-1">{label}</span>
                  <span className={cn(
                    "tabular-nums text-[10px]",
                    enabled ? "text-slate-500" : "text-slate-700"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
            <p className="text-[10px] text-slate-600 px-2 pt-1">
              Zoom in close to see site labels
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="border-t border-slate-700/50 px-4 py-3 hidden sm:block">
        <div className="text-[10px] text-slate-600 space-y-0.5 leading-relaxed">
          <p>Click satellite or launch site to inspect</p>
          <p>Click orbital shell for orbit facts</p>
          <p>Press <kbd className="bg-slate-800 rounded px-1 font-mono">/</kbd> to search</p>
        </div>
      </div>
    </div>
  );
}
