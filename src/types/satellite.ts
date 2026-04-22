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

export type OrbitCategory =
  | "stations"
  | "starlink"
  | "gps"
  | "weather"
  | "debris"
  | "amateur"
  | "geo";

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
