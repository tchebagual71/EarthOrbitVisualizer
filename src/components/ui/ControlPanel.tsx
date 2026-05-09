"use client";
import { useRef, useState, useCallback } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import { cn } from "@/lib/utils";

export function ControlPanel() {
  const {
    enabledCategories,
    showLaunchSites, setShowLaunchSites,
    setShowSearch,
  } = useStore();
  const { satellites, isLoading } = useAllTLEData(enabledCategories);
  const [collapsed, setCollapsed] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragOrigin = useRef<{
    clientX: number;
    clientY: number;
    panelX: number;
    panelY: number;
  } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panelX: rect.left,
      panelY: rect.top,
    };
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

  const onPointerUp = useCallback(() => {
    dragOrigin.current = null;
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute z-20 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-xl text-white text-lg transition-colors hover:bg-slate-800/90 active:scale-95"
        style={{
          left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
          top: "50%",
          transform: "translateY(-50%)",
        }}
        aria-label="Open satellite controls"
      >
        ☰
      </button>
    );
  }

  const panelStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y }
    : { marginLeft: "env(safe-area-inset-left, 0px)" };

  const panelClass = pos
    ? "z-20 w-52 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 shadow-2xl"
    : "absolute left-4 top-1/2 -translate-y-1/2 z-20 w-52 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 shadow-2xl";

  return (
    <div ref={panelRef} style={panelStyle} className={panelClass}>
      {/* Drag handle + collapse */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between mb-1 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <h1 className="text-base font-bold text-white">Earth Orbit</h1>
        <div className="flex items-center gap-1.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-sm"
            aria-label="Collapse panel"
          >
            ‹
          </button>
          <span className="text-slate-500 text-lg leading-none tracking-widest">⠷</span>
        </div>
      </div>

      {/* Count + search */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">Real-time satellite tracker</p>
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <span className="text-xs text-blue-400 animate-pulse">loading…</span>
          ) : (
            <span className="text-xs text-slate-500 tabular-nums">{satellites.length.toLocaleString()}</span>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowSearch(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-xs"
            aria-label="Search satellites"
            title="Search satellites"
          >
            🔍
          </button>
        </div>
      </div>

      <CategoryFilter />

      {/* Overlay toggles */}
      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowLaunchSites(!showLaunchSites)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 min-h-[44px] text-xs w-full text-left transition-colors",
            showLaunchSites
              ? "text-amber-300 bg-amber-900/20 hover:bg-amber-900/30"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
          )}
        >
          <span>🚀</span>
          <span>Launch Sites</span>
          {showLaunchSites && <span className="ml-auto text-amber-400">✓</span>}
        </button>
      </div>

      <div className={cn(
        "mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500 space-y-1",
        "hidden sm:block"
      )}>
        <p>Tap a satellite to inspect</p>
        <p>Click orbital shell for info</p>
        <p>Pinch to zoom · Drag to rotate</p>
      </div>
    </div>
  );
}
