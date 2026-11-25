import { NextResponse } from "next/server";
import { parseCloseApproaches, parseHorizonsVectors, type Flyby } from "@/lib/flybys";

export const runtime = "edge";

// Asteroids passing within this distance over the coming weeks (plus the few
// that passed in the last days and are still nearby)
const MAX_DIST_AU = 0.05; // ≈ 19.5 lunar distances
const LOOKAHEAD_DAYS = 60;
const LOOKBACK_DAYS = 3;
const MAX_OBJECTS = 20; // closest first — each needs one Horizons request
// Trajectory window around closest approach
const PATH_HALF_SPAN_DAYS = 3;
const PATH_STEP = "3h";
const CONCURRENCY = 5;

const CAD_URL = "https://ssd-api.jpl.nasa.gov/cad.api";
const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
const CACHE_TTL_MS = 6 * 3600_000;

interface FlybysPayload {
  generatedAt: number;
  flybys: Flyby[];
}

let cache: FlybysPayload | null = null;

const HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
};

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

async function fetchPath(flyby: Flyby): Promise<Flyby["path"]> {
  // Numbered asteroids are addressed by number, the rest by designation
  const command = /^\d+$/.test(flyby.des) ? `${flyby.des};` : `DES=${flyby.des};`;
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@399'", // geocentric
    REF_PLANE: "'FRAME'", // equatorial (ICRF), matching the satellites' frame
    VEC_TABLE: "'1'",
    CSV_FORMAT: "'YES'",
    OUT_UNITS: "'KM-S'",
    START_TIME: `'JD${(flyby.jdTdb - PATH_HALF_SPAN_DAYS).toFixed(5)}'`,
    STOP_TIME: `'JD${(flyby.jdTdb + PATH_HALF_SPAN_DAYS).toFixed(5)}'`,
    STEP_SIZE: `'${PATH_STEP}'`,
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${HORIZONS_URL}?${params}`);
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: string };
      const path = parseHorizonsVectors(json.result ?? "");
      if (path) return path;
    } catch {
      // retry once, then give up on this object's trajectory
    }
  }
  return null;
}

export async function GET() {
  if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache, { headers: HEADERS });
  }

  try {
    const now = Date.now();
    const cadParams = new URLSearchParams({
      "dist-max": String(MAX_DIST_AU),
      "date-min": isoDay(now - LOOKBACK_DAYS * 86_400_000),
      "date-max": isoDay(now + LOOKAHEAD_DAYS * 86_400_000),
      fullname: "true",
      diameter: "true",
    });
    const res = await fetch(`${CAD_URL}?${cadParams}`);
    if (!res.ok) throw new Error(`JPL close-approach API ${res.status}`);

    const flybys = parseCloseApproaches(await res.json())
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, MAX_OBJECTS);

    // Horizons asks clients to keep concurrency low
    for (let i = 0; i < flybys.length; i += CONCURRENCY) {
      const batch = flybys.slice(i, i + CONCURRENCY);
      const paths = await Promise.all(batch.map(fetchPath));
      batch.forEach((f, j) => { f.path = paths[j]; });
    }
    flybys.sort((a, b) => a.caTimeMs - b.caTimeMs);

    cache = { generatedAt: now, flybys };
    return NextResponse.json(cache, { headers: HEADERS });
  } catch (err) {
    if (cache) {
      return NextResponse.json(cache, { headers: { ...HEADERS, "X-Data-Stale": "true" } });
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
