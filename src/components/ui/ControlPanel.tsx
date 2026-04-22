"use client";
import { CategoryFilter } from "./CategoryFilter";

export function ControlPanel() {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-52 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 shadow-2xl">
      <h1 className="text-base font-bold text-white mb-1">Earth Orbit</h1>
      <p className="text-xs text-slate-400 mb-4">Real-time satellite tracker</p>
      <CategoryFilter />

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500 space-y-1">
        <p>Click a satellite to inspect</p>
        <p>Scroll to zoom · Drag to rotate</p>
      </div>
    </div>
  );
}
