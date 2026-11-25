// Near-Earth asteroid flybys: parsing for NASA/JPL's close-approach (CAD) and
// Horizons APIs, plus the small amount of math needed to draw them.
import type { EciKm } from "./moon";

export const AU_KM = 149_597_870.7;
export const LUNAR_DISTANCE_KM = 384_400;

// Horizons reports Barycentric Dynamical Time; UTC trails it by ~69.2 s.
const TDB_MINUS_UTC_MS = 69_184;

export const jdTdbToUnixMs = (jd: number): number =>
  (jd - 2440587.5) * 86_400_000 - TDB_MINUS_UTC_MS;

// Geocentric positions sampled at a fixed step, equatorial inertial frame, km
export interface FlybyPath {
  t0Ms: number;
  stepMs: number;
  xyz: number[]; // [x0,y0,z0, x1,y1,z1, …]
}

export interface Flyby {
  des: string; // designation, e.g. "2026 VQ19"
  name: string;
  jdTdb: number; // time of closest approach, as JPL gives it
  caTimeMs: number; // the same, unix ms UTC
  distKm: number; // nominal miss distance from the Earth's center
  distMinKm: number; // 3-sigma closest
  vRelKms: number;
  h: number | null; // absolute magnitude
  diameterM: number | null; // measured if known, else estimated from h
  path: FlybyPath | null;
}

interface CadResponse {
  fields?: string[];
  data?: (string | null)[][];
}

// Rough diameter from absolute magnitude, assuming a typical albedo of 0.14
export function estimateDiameterM(h: number): number {
  return (1329_000 / Math.sqrt(0.14)) * Math.pow(10, -h / 5);
}

export function parseCloseApproaches(json: unknown): Flyby[] {
  const { fields, data } = (json ?? {}) as CadResponse;
  if (!Array.isArray(fields) || !Array.isArray(data)) return [];
  const col = (name: string): number => fields.indexOf(name);
  const iDes = col("des");
  const iJd = col("jd");
  const iDist = col("dist");
  const iMin = col("dist_min");
  const iV = col("v_rel");
  const iH = col("h");
  const iDia = col("diameter");
  const iName = col("fullname");
  if (iDes < 0 || iJd < 0 || iDist < 0) return [];

  const num = (row: (string | null)[], i: number): number =>
    i >= 0 && row[i] != null ? Number(row[i]) : NaN;

  const out: Flyby[] = [];
  for (const row of data) {
    const des = row[iDes];
    const jd = num(row, iJd);
    const dist = num(row, iDist);
    if (!des || !Number.isFinite(jd) || !Number.isFinite(dist)) continue;
    const h = num(row, iH);
    const diaKm = num(row, iDia);
    const distMin = num(row, iMin);
    const v = num(row, iV);
    out.push({
      des,
      name: (iName >= 0 ? row[iName] : null)?.trim().replace(/^\((.*)\)$/, "$1") || des,
      jdTdb: jd,
      caTimeMs: jdTdbToUnixMs(jd),
      distKm: dist * AU_KM,
      distMinKm: (Number.isFinite(distMin) ? distMin : dist) * AU_KM,
      vRelKms: Number.isFinite(v) ? v : 0,
      h: Number.isFinite(h) ? h : null,
      diameterM: Number.isFinite(diaKm)
        ? diaKm * 1000
        : Number.isFinite(h)
          ? estimateDiameterM(h)
          : null,
      path: null,
    });
  }
  return out;
}

// Parse the $$SOE…$$EOE block of a Horizons VECTORS table requested with
// CSV_FORMAT=YES, VEC_TABLE=1: "JDTDB, Calendar Date (TDB), X, Y, Z,".
export function parseHorizonsVectors(result: string): FlybyPath | null {
  const start = result.indexOf("$$SOE");
  const end = result.indexOf("$$EOE");
  if (start < 0 || end < start) return null;
  const jds: number[] = [];
  const xyz: number[] = [];
  for (const line of result.slice(start + 5, end).split("\n")) {
    const parts = line.split(",");
    if (parts.length < 5) continue;
    const jd = Number(parts[0]);
    const x = Number(parts[2]);
    const y = Number(parts[3]);
    const z = Number(parts[4]);
    if (!Number.isFinite(jd + x + y + z)) continue;
    jds.push(jd);
    xyz.push(x, y, z);
  }
  if (jds.length < 2) return null;
  return {
    t0Ms: jdTdbToUnixMs(jds[0]),
    stepMs: ((jds[jds.length - 1] - jds[0]) * 86_400_000) / (jds.length - 1),
    xyz,
  };
}

// Position at `ms` by linear interpolation; null outside the sampled window.
export function flybyPositionAt(path: FlybyPath, ms: number): EciKm | null {
  const n = path.xyz.length / 3;
  const f = (ms - path.t0Ms) / path.stepMs;
  if (!(f >= 0) || f > n - 1) return null;
  const i = Math.min(Math.floor(f), n - 2);
  const t = f - i;
  const a = i * 3;
  return {
    x: path.xyz[a] + (path.xyz[a + 3] - path.xyz[a]) * t,
    y: path.xyz[a + 1] + (path.xyz[a + 4] - path.xyz[a + 1]) * t,
    z: path.xyz[a + 2] + (path.xyz[a + 5] - path.xyz[a + 2]) * t,
  };
}

export function formatLunarDistances(km: number): string {
  const ld = km / LUNAR_DISTANCE_KM;
  return `${ld < 10 ? ld.toFixed(1) : Math.round(ld)} LD`;
}

export function formatDiameter(m: number | null): string {
  if (m === null) return "size unknown";
  if (m >= 1000) return `~${(m / 1000).toFixed(1)} km`;
  return `~${m >= 10 ? Math.round(m) : m.toFixed(1)} m`;
}
