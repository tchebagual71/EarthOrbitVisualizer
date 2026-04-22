export const EARTH_RADIUS_KM = 6371;

// 1 Three.js unit = SCENE_SCALE_KM kilometers
export const SCENE_SCALE_KM = 1000;
export const EARTH_RADIUS_SCENE = EARTH_RADIUS_KM / SCENE_SCALE_KM; // ~6.371

// Orbit altitude boundaries (km above surface)
export const ORBIT_BOUNDARIES = {
  LEO_MAX: 2000,
  MEO_MAX: 35786,
  GEO: 35786,
} as const;

// How many seconds one "real" second represents at each speed
export const TIME_SPEEDS = [0, 1, 10, 60, 300, 3600] as const;
export type TimeSpeed = (typeof TIME_SPEEDS)[number];

export const CELESTRAK_BASE = "https://celestrak.org/SOCRATES/query.php";

// Satellite marker size in scene units
export const SAT_MARKER_SIZE = 0.04;
