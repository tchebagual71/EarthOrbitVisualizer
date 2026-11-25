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

// Batch-propagate satellites into shared typed arrays. Used by the
// propagation Web Worker (and as a main-thread fallback): one gstime() per
// batch, no per-satellite allocations beyond what satellite.js requires.
// Writes scene coordinates into positions[i*3..i*3+2] and 1/0 into valid[i].
export function propagateBatch(
  satrecs: (satellite.SatRec | null)[],
  date: Date,
  positions: Float32Array,
  valid: Uint8Array
): void {
  const gmst = satellite.gstime(date);
  const n = Math.min(satrecs.length, valid.length, Math.floor(positions.length / 3));
  for (let i = 0; i < n; i++) {
    const satrec = satrecs[i];
    if (!satrec) {
      valid[i] = 0;
      continue;
    }
    const result = satellite.propagate(satrec, date);
    if (!result.position || typeof result.position === "boolean") {
      valid[i] = 0;
      continue;
    }
    const ecef = satellite.eciToEcf(result.position as satellite.EciVec3<number>, gmst);
    const x = ecef.x / SCENE_SCALE_KM;
    const y = ecef.z / SCENE_SCALE_KM;
    const z = -ecef.y / SCENE_SCALE_KM;
    if (!Number.isFinite(x + y + z)) {
      valid[i] = 0;
      continue;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    valid[i] = 1;
  }
}

// One revolution of the orbit, expressed in the scene (Earth-fixed) frame as
// it is oriented at `date`: every point uses the *same* sidereal angle, so the
// result is the closed inertial ellipse rather than an Earth-relative spiral
// (which is what the ground track shows). To keep it correct as time moves on
// without re-propagating, rotate it by orbitFrameRotationY(date, now).
export function getOrbitPath(
  satrec: satellite.SatRec,
  date: Date,
  steps = 90
): ScenePosition[] {
  const period = (2 * Math.PI) / satrec.no; // minutes
  const gmst = satellite.gstime(date);
  const points: ScenePosition[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(date.getTime() + (i / steps) * period * 60 * 1000);
    const result = satellite.propagate(satrec, t);
    if (!result.position || typeof result.position === "boolean") continue;
    const p = eciToScene(result.position as satellite.EciVec3<number>, gmst);
    if (Number.isFinite(p.x + p.y + p.z)) points.push(p);
  }
  return points;
}

// Orientation of the inertial frame within the Earth-fixed scene at `date`,
// as a rotation about the scene Y axis (radians). The Earth turns east, so
// inertial things (stars, orbit planes) drift west.
export function inertialFrameRotationY(date: Date): number {
  return -satellite.gstime(date);
}

// Rotation about the scene Y axis (radians) that carries inertial geometry
// expressed in the Earth-fixed frame of `computedAt` into the Earth-fixed
// frame of `now`.
export function orbitFrameRotationY(computedAt: Date, now: Date): number {
  return inertialFrameRotationY(now) - inertialFrameRotationY(computedAt);
}

// Camera position for a "chase" view of a satellite: above it (away from
// the Earth), behind its direction of travel and a little out of the orbital
// plane, so both the Earth below and the orbit ahead are in view. `ahead` is
// the satellite's position a short time later. Stand-off scales with orbit
// size: ~2,500 km for LEO up to ~14,000 km for GEO.
export function chaseCameraPosition(pos: ScenePosition, ahead: ScenePosition): ScenePosition {
  const r = Math.hypot(pos.x, pos.y, pos.z) || 1;
  const up = { x: pos.x / r, y: pos.y / r, z: pos.z / r };
  // Direction of travel, with the radial component removed
  let fx = ahead.x - pos.x;
  let fy = ahead.y - pos.y;
  let fz = ahead.z - pos.z;
  const radial = fx * up.x + fy * up.y + fz * up.z;
  fx -= radial * up.x;
  fy -= radial * up.y;
  fz -= radial * up.z;
  let fLen = Math.hypot(fx, fy, fz);
  if (fLen < 1e-9) {
    // No usable motion (e.g. geostationary in the Earth-fixed frame): use east
    fx = up.z;
    fy = 0;
    fz = -up.x;
    fLen = Math.hypot(fx, fy, fz) || 1;
  }
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;
  // side = up × forward
  const sx = up.y * fz - up.z * fy;
  const sy = up.z * fx - up.x * fz;
  const sz = up.x * fy - up.y * fx;
  const d = Math.min(14, Math.max(2.5, r * 0.35));
  // Low orbits get a shallow over-the-shoulder view (the Earth fills the
  // frame anyway); high orbits look more steeply down so the now-small Earth
  // stays in shot.
  const k = Math.min(1, Math.max(0, (r - 8) / 30));
  const u = 0.6 + 0.35 * k;
  const b = 0.7 - 0.45 * k;
  const w = 0.4 - 0.25 * k;
  return {
    x: pos.x + d * (u * up.x - b * fx + w * sx),
    y: pos.y + d * (u * up.y - b * fy + w * sy),
    z: pos.z + d * (u * up.z - b * fz + w * sz),
  };
}

// True when the Earth blocks the straight line from `eye` to `point`
// (both in scene coordinates). Used so far-side satellites can't be picked.
export function isOccludedByEarth(
  eye: ScenePosition,
  point: ScenePosition,
  radiusScene = EARTH_RADIUS_SCENE
): boolean {
  const dx = point.x - eye.x;
  const dy = point.y - eye.y;
  const dz = point.z - eye.z;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq === 0) return false;
  // Closest approach of the eye→point segment to the Earth's center
  const t = Math.min(1, Math.max(0, -(eye.x * dx + eye.y * dy + eye.z * dz) / lenSq));
  const cx = eye.x + t * dx;
  const cy = eye.y + t * dy;
  const cz = eye.z + t * dz;
  return cx * cx + cy * cy + cz * cz < radiusScene * radiusScene;
}

export interface LiveState {
  altitudeKm: number; // geodetic height above the WGS-84 ellipsoid
  speedKms: number; // inertial speed
  latDeg: number;
  lonDeg: number; // east-positive, −180…180
}

// Instantaneous state of a satellite at `date`, for the info panel.
export function getLiveState(satrec: satellite.SatRec, date: Date): LiveState | null {
  const result = satellite.propagate(satrec, date);
  if (!result.position || typeof result.position === "boolean") return null;
  if (!result.velocity || typeof result.velocity === "boolean") return null;
  const v = result.velocity as satellite.EciVec3<number>;
  const geo = satellite.eciToGeodetic(
    result.position as satellite.EciVec3<number>,
    satellite.gstime(date)
  );
  const state = {
    altitudeKm: geo.height,
    speedKms: Math.hypot(v.x, v.y, v.z),
    latDeg: satellite.degreesLat(geo.latitude),
    lonDeg: satellite.degreesLong(geo.longitude),
  };
  return Number.isFinite(state.altitudeKm + state.speedKms + state.latDeg + state.lonDeg)
    ? state
    : null;
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
