"use client";
import { create } from "zustand";
import type { OrbitCategory, SatelliteRecord } from "@/types/satellite";
import type { TimeSpeed } from "@/lib/constants";
import type { LaunchSiteType } from "@/lib/launchsites";

interface SceneVec3 { x: number; y: number; z: number; }

interface AppState {
  // Time
  simTime: Date;
  timeSpeed: TimeSpeed;
  playing: boolean;
  setSimTime: (t: Date) => void;
  setTimeSpeed: (s: TimeSpeed) => void;
  setPlaying: (p: boolean) => void;

  // Satellite selection
  selectedSat: SatelliteRecord | null;
  setSelectedSat: (s: SatelliteRecord | null) => void;
  showOrbitPath: boolean;
  setShowOrbitPath: (v: boolean) => void;
  showGroundTrack: boolean;
  setShowGroundTrack: (v: boolean) => void;

  // Satellite filters
  enabledCategories: Set<OrbitCategory>;
  toggleCategory: (c: OrbitCategory) => void;
  setAllCategories: (cats: OrbitCategory[], enabled: boolean) => void;

  // Launch sites
  showLaunchSites: boolean;
  setShowLaunchSites: (v: boolean) => void;
  enabledSiteTypes: Set<LaunchSiteType>;
  toggleSiteType: (t: LaunchSiteType) => void;

  // Learning mode (orbital shell info)
  learningShell: number | null;
  setLearningShell: (v: number | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;

  // Camera animation targets
  jumpTarget: SatelliteRecord | null;          // jump to propagated satellite position
  setJumpTarget: (s: SatelliteRecord | null) => void;
  jumpPosition: SceneVec3 | null;              // jump to fixed scene position (e.g. launch site)
  setJumpPosition: (p: SceneVec3 | null) => void;
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
  showGroundTrack: true,
  setShowGroundTrack: (showGroundTrack) => set({ showGroundTrack }),

  enabledCategories: new Set<OrbitCategory>([
    "stations", "starlink", "gps", "weather", "geo", "amateur", "debris",
  ]),
  toggleCategory: (c) =>
    set((s) => {
      const next = new Set(s.enabledCategories);
      if (next.has(c)) next.delete(c); else next.add(c);
      return { enabledCategories: next };
    }),
  setAllCategories: (cats, enabled) =>
    set((s) => {
      const next = new Set(s.enabledCategories);
      cats.forEach((c) => (enabled ? next.add(c) : next.delete(c)));
      return { enabledCategories: next };
    }),

  showLaunchSites: true,
  setShowLaunchSites: (showLaunchSites) => set({ showLaunchSites }),
  enabledSiteTypes: new Set<LaunchSiteType>(["gov", "commercial", "test", "planned", "historical"]),
  toggleSiteType: (t) =>
    set((s) => {
      const next = new Set(s.enabledSiteTypes);
      if (next.has(t)) next.delete(t); else next.add(t);
      return { enabledSiteTypes: next };
    }),

  learningShell: null,
  setLearningShell: (learningShell) => set({ learningShell }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  showSearch: false,
  setShowSearch: (showSearch) => set({ showSearch }),

  jumpTarget: null,
  setJumpTarget: (jumpTarget) => set({ jumpTarget }),
  jumpPosition: null,
  setJumpPosition: (jumpPosition) => set({ jumpPosition }),
}));
