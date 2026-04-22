import type { TLERecord, SatelliteRecord, OrbitCategory } from "@/types/satellite";
import * as satellite from "satellite.js";
import { EARTH_RADIUS_KM, ORBIT_BOUNDARIES } from "./constants";

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
  category: OrbitCategory
): SatelliteRecord | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const now = new Date();
    const result = satellite.propagate(satrec, now);
    if (!result.position || typeof result.position === "boolean") return null;

    const posEci = result.position as satellite.EciVec3<number>;
    const r = Math.sqrt(posEci.x ** 2 + posEci.y ** 2 + posEci.z ** 2);
    const altitude = r - EARTH_RADIUS_KM;

    const inclination = (satrec.inclo * 180) / Math.PI;

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

export function classifyAltitude(altitudeKm: number): string {
  if (altitudeKm < ORBIT_BOUNDARIES.LEO_MAX) return "LEO";
  if (altitudeKm < ORBIT_BOUNDARIES.MEO_MAX) return "MEO";
  if (Math.abs(altitudeKm - ORBIT_BOUNDARIES.GEO) < 500) return "GEO";
  return "HEO";
}
