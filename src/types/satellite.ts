// Derived from CELESTRAK_GROUPS — re-exported here so consumers keep a single
// import site for satellite types (type-only cycle with categories.ts is fine).
import type { OrbitCategory } from "@/lib/categories";
export type { OrbitCategory } from "@/lib/categories";

export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
}

export interface SatelliteRecord {
  id: string;
  name: string;
  line1: string;
  line2: string;
  category: OrbitCategory;
  noradId: number;
  inclination: number;
  altitude: number;
}

export interface SatellitePosition {
  id: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

export interface OrbitalPath {
  points: [number, number, number][];
}

export interface CelestrakGroup {
  id: OrbitCategory;
  label: string;
  url: string;
  color: string;
  maxDisplay: number;
}
