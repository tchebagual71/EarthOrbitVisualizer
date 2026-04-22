"use client";
import { create } from "zustand";
import type { OrbitCategory, SatelliteRecord } from "@/types/satellite";
import type { TimeSpeed } from "@/lib/constants";

interface AppState {
  // Time
  simTime: Date;
  timeSpeed: TimeSpeed;
  playing: boolean;
  setSimTime: (t: Date) => void;
  setTimeSpeed: (s: TimeSpeed) => void;
  setPlaying: (p: boolean) => void;

  // Selection
  selectedSat: SatelliteRecord | null;
  setSelectedSat: (s: SatelliteRecord | null) => void;
  showOrbitPath: boolean;
  setShowOrbitPath: (v: boolean) => void;

  // Filters
  enabledCategories: Set<OrbitCategory>;
  toggleCategory: (c: OrbitCategory) => void;
  setAllCategories: (cats: OrbitCategory[], enabled: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  simTime: new Date(),
  timeSpeed: 1,
  playing: true,
  setSimTime: (simTime) => set({ simTime }),
  setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
  setPlaying: (playing) => set({ playing }),

  selectedSat: null,
  setSelectedSat: (selectedSat) => set({ selectedSat }),
  showOrbitPath: true,
  setShowOrbitPath: (showOrbitPath) => set({ showOrbitPath }),

  enabledCategories: new Set<OrbitCategory>([
    "stations",
    "starlink",
    "gps",
    "weather",
    "geo",
    "amateur",
    "debris",
  ]),
  toggleCategory: (c) =>
    set((state) => {
      const next = new Set(state.enabledCategories);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { enabledCategories: next };
    }),
  setAllCategories: (cats, enabled) =>
    set((state) => {
      const next = new Set(state.enabledCategories);
      cats.forEach((c) => (enabled ? next.add(c) : next.delete(c)));
      return { enabledCategories: next };
    }),
}));
