import * as satellite from "satellite.js";
import { SCENE_SCALE_KM } from "./constants";

export interface ScenePosition {
  x: number;
  y: number;
  z: number;
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
