import type { CelestrakGroup, TLERecord, SatelliteRecord, OrbitCategory } from "@/types/satellite";
import * as satellite from "satellite.js";
import { EARTH_RADIUS_KM, ORBIT_BOUNDARIES } from "./constants";

// Earth's gravitational parameter, km³/s²
const GM = 398600.4418;

export function parseTLEText(text: string): TLERecord[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const records: TLERecord[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const line1 = lines[i + 1].trim();
    const line2 = lines[i + 2].trim();
    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      records.push({ name, line1, line2 });
    }
  }
  return records;
}

export function tleToSatelliteRecord(
  tle: TLERecord,
  category: OrbitCategory,
  at: Date = new Date()
): SatelliteRecord | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const result = satellite.propagate(satrec, at);
    if (!result.position || typeof result.position === "boolean") return null;

    const posEci = result.position as satellite.EciVec3<number>;
    const r = Math.sqrt(posEci.x ** 2 + posEci.y ** 2 + posEci.z ** 2);
    const altitude = r - EARTH_RADIUS_KM;

    const inclination = (satrec.inclo * 180) / Math.PI;

    // twoline2satrec doesn't throw on malformed lines — it yields a satrec
    // that propagates to NaN. Reject those instead of emitting NaN records.
    if (!Number.isFinite(altitude) || !Number.isFinite(inclination) || !Number.isFinite(Number(satrec.satnum))) {
      return null;
    }

    return {
      id: String(satrec.satnum),
      name: tle.name,
      line1: tle.line1,
      line2: tle.line2,
      category,
      noradId: Number(satrec.satnum),
      inclination,
      altitude: Math.round(altitude),
    };
  } catch {
    return null;
  }
}

// Turn the raw TLE text of one or more CelesTrak files into the records for
// a category: drops names the group excludes, de-duplicates by NORAD id
// (first occurrence wins) and stops at the group's display cap.
export function recordsFromTLETexts(
  texts: string[],
  group: Pick<CelestrakGroup, "id" | "maxDisplay" | "excludeName">,
  at: Date = new Date()
): SatelliteRecord[] {
  const seen = new Set<number>();
  const records: SatelliteRecord[] = [];
  for (const text of texts) {
    for (const tle of parseTLEText(text)) {
      if (records.length >= group.maxDisplay) return records;
      if (group.excludeName?.test(tle.name)) continue;
      const rec = tleToSatelliteRecord(tle, group.id, at);
      if (!rec || seen.has(rec.noradId)) continue;
      seen.add(rec.noradId);
      records.push(rec);
    }
  }
  return records;
}

// Merge per-category lists into one, keeping the first record for each NORAD
// id — objects listed in several CelesTrak groups are drawn (and picked) once.
export function dedupeByNoradId(lists: SatelliteRecord[][]): SatelliteRecord[] {
  const seen = new Set<number>();
  const out: SatelliteRecord[] = [];
  for (const list of lists) {
    for (const rec of list) {
      if (seen.has(rec.noradId)) continue;
      seen.add(rec.noradId);
      out.push(rec);
    }
  }
  return out;
}

// Perigee/apogee altitude straight from the TLE text (mean motion and
// eccentricity columns of line 2) — cheap enough to scan the whole catalogue.
export function apsidesFromTLE(line2: string): { perigeeKm: number; apogeeKm: number } | null {
  const revsPerDay = parseFloat(line2.substring(52, 63));
  const ecc = parseFloat(`0.${line2.substring(26, 33).trim()}`);
  if (!(revsPerDay > 0) || !Number.isFinite(ecc)) return null;
  const nRadSec = (revsPerDay * 2 * Math.PI) / 86400;
  const a = Math.cbrt(GM / (nRadSec * nRadSec));
  return {
    perigeeKm: a * (1 - ecc) - EARTH_RADIUS_KM,
    apogeeKm: a * (1 + ecc) - EARTH_RADIUS_KM,
  };
}

// "reentering": so low that drag will bring it down within days to weeks.
// "decaying": low enough to be sinking steadily.
// "skimming": an eccentric orbit that dips into the upper atmosphere at
// perigee and swings back out — it runs past rather than falls in (for now).
export type AtmosphereWatchKind = "reentering" | "decaying" | "skimming";

export interface AtmosphereWatchEntry {
  sat: SatelliteRecord;
  perigeeKm: number;
  apogeeKm: number;
  kind: AtmosphereWatchKind;
}

export const ATMOSPHERE_WATCH_PERIGEE_KM = 300;
const REENTERING_PERIGEE_KM = 200;
const SKIMMING_MIN_SPAN_KM = 1000;

// Tracked objects whose orbit reaches into the upper atmosphere, lowest
// perigee first.
export function atmosphereWatch(
  sats: SatelliteRecord[],
  maxPerigeeKm = ATMOSPHERE_WATCH_PERIGEE_KM
): AtmosphereWatchEntry[] {
  const out: AtmosphereWatchEntry[] = [];
  for (const sat of sats) {
    const apsides = apsidesFromTLE(sat.line2);
    if (!apsides || apsides.perigeeKm >= maxPerigeeKm) continue;
    const kind: AtmosphereWatchKind =
      apsides.apogeeKm - apsides.perigeeKm > SKIMMING_MIN_SPAN_KM
        ? "skimming"
        : apsides.perigeeKm < REENTERING_PERIGEE_KM
          ? "reentering"
          : "decaying";
    out.push({ sat, ...apsides, kind });
  }
  return out.sort((a, b) => a.perigeeKm - b.perigeeKm);
}

const GEO_TOLERANCE_KM = 500;

export function classifyAltitude(altitudeKm: number): string {
  // GEO tolerance band must be checked before the MEO upper bound,
  // otherwise altitudes just below 35,786 km would classify as MEO.
  if (Math.abs(altitudeKm - ORBIT_BOUNDARIES.GEO) < GEO_TOLERANCE_KM) return "GEO";
  if (altitudeKm < ORBIT_BOUNDARIES.LEO_MAX) return "LEO";
  if (altitudeKm < ORBIT_BOUNDARIES.MEO_MAX) return "MEO";
  return "HEO";
}

// Orbit class from mean elements. More robust than an instantaneous-altitude
// snapshot, which mislabels eccentric orbits (a Molniya sat near perigee
// would read as LEO).
function semiMajorAxisKm(satrec: satellite.SatRec): number {
  const nRadSec = satrec.no / 60; // satrec.no is rad/min
  return Math.cbrt(GM / (nRadSec * nRadSec));
}

// Perigee and apogee altitudes (km above the mean-radius sphere) from mean
// elements.
export function orbitApsides(satrec: satellite.SatRec): { perigeeKm: number; apogeeKm: number } {
  const a = semiMajorAxisKm(satrec);
  return {
    perigeeKm: a * (1 - satrec.ecco) - EARTH_RADIUS_KM,
    apogeeKm: a * (1 + satrec.ecco) - EARTH_RADIUS_KM,
  };
}

export function classifyOrbit(satrec: satellite.SatRec): string {
  const meanAltKm = semiMajorAxisKm(satrec) - EARTH_RADIUS_KM;
  if (satrec.ecco > 0.25) return "HEO";
  if (Math.abs(meanAltKm - ORBIT_BOUNDARIES.GEO) < GEO_TOLERANCE_KM) return "GEO";
  if (meanAltKm < ORBIT_BOUNDARIES.LEO_MAX) return "LEO";
  if (meanAltKm < ORBIT_BOUNDARIES.MEO_MAX) return "MEO";
  return "HEO";
}

export function parseTLEEpoch(line1: string): Date {
  const yr2 = parseInt(line1.substring(18, 20), 10);
  const year = yr2 < 57 ? 2000 + yr2 : 1900 + yr2;
  const dayOfYear = parseFloat(line1.substring(20, 32));
  const d = new Date(Date.UTC(year, 0, 1));
  d.setTime(d.getTime() + (dayOfYear - 1) * 86400000);
  return d;
}

export function getTLEAgeHours(line1: string, now: Date): number {
  const epoch = parseTLEEpoch(line1);
  return (now.getTime() - epoch.getTime()) / 3600000;
}

// Orbital period in minutes from mean motion (rad/min)
export function orbitalPeriodMin(noRadsPerMin: number): number {
  return (2 * Math.PI) / noRadsPerMin;
}

// Approximate circular orbital velocity km/s
export function orbitalVelocityKms(altKm: number): number {
  return Math.sqrt(GM / (EARTH_RADIUS_KM + altKm));
}
