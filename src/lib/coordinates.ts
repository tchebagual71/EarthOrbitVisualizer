import * as satellite from "satellite.js";
import { EARTH_RADIUS_SCENE, SCENE_SCALE_KM } from "./constants";

export interface ScenePosition {
  x: number;
  y: number;
  z: number;
}

// Geodetic lat/lon (degrees) → Three.js scene coordinates
export function latLonToScene(
  lat: number,
  lon: number,
  radiusScene = EARTH_RADIUS_SCENE
): ScenePosition {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return {
    x: Math.cos(latRad) * Math.cos(lonRad) * radiusScene,
    y: Math.sin(latRad) * radiusScene,
    z: -Math.cos(latRad) * Math.sin(lonRad) * radiusScene,
  };
}

export function eciToScene(
  posEci: satellite.EciVec3<number>,
  gmst: number
): ScenePosition {
  const posEcef = satellite.eciToEcf(posEci, gmst);
  return {
    x: posEcef.x / SCENE_SCALE_KM,
    y: posEcef.z / SCENE_SCALE_KM,  // Z_ecef → Y_scene (north pole = up)
    z: -posEcef.y / SCENE_SCALE_KM, // Y_ecef → -Z_scene
  };
}

export function propagateAt(
  satrec: satellite.SatRec,
  date: Date
): ScenePosition | null {
  const result = satellite.propagate(satrec, date);
  if (!result.position || typeof result.position === "boolean") return null;
  const gmst = satellite.gstime(date);
  return eciToScene(result.position as satellite.EciVec3<number>, gmst);
}

export function getOrbitPath(
  satrec: satellite.SatRec,
  date: Date,
  steps = 90
): ScenePosition[] {
  const period = (2 * Math.PI) / satrec.no; // minutes
  const points: ScenePosition[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(date.getTime() + (i / steps) * period * 60 * 1000);
    const pos = propagateAt(satrec, t);
    if (pos) points.push(pos);
  }
  return points;
}

// Sub-satellite ground track projected onto Earth surface
export function getGroundTrack(
  satrec: satellite.SatRec,
  date: Date,
  steps = 90
): ScenePosition[] {
  const period = (2 * Math.PI) / satrec.no;
  const r = EARTH_RADIUS_SCENE * 1.002;
  const points: ScenePosition[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(date.getTime() + (i / steps) * period * 60 * 1000);
    const result = satellite.propagate(satrec, t);
    if (!result.position || typeof result.position === "boolean") continue;
    const gmst = satellite.gstime(t);
    const ecef = satellite.eciToEcf(result.position as satellite.EciVec3<number>, gmst);
    const len = Math.sqrt(ecef.x ** 2 + ecef.y ** 2 + ecef.z ** 2);
    if (len === 0) continue;
    points.push({ x: (ecef.x / len) * r, y: (ecef.z / len) * r, z: (-ecef.y / len) * r });
  }
  return points;
}
