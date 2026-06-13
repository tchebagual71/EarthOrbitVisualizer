import { NextRequest, NextResponse } from "next/server";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { parseTLEText, tleToSatelliteRecord } from "@/lib/tle";
import type { SatelliteRecord } from "@/types/satellite";

// Edge runtime: works on both Vercel Edge and Cloudflare Pages
export const runtime = "edge";

const CACHE_TTL_MS = 3600_000;

// Module-level cache: spares CelesTrak on dev-server reloads (where there is
// no CDN cache) and on warm edge isolates, and doubles as a stale fallback
// when the upstream is down.
const memCache = new Map<string, { at: number; records: SatelliteRecord[] }>();

const CDN_CACHE_HEADERS = {
  // CDN (Vercel Edge / Cloudflare) caches for 1 hour; serves stale for 2 more
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
};

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  const group = CELESTRAK_GROUPS.find((g) => g.id === category);
  if (!group) {
    return NextResponse.json({ error: "unknown category" }, { status: 400 });
  }

  const cached = memCache.get(group.id);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.records, { headers: CDN_CACHE_HEADERS });
  }

  try {
    const res = await fetch(group.url, {
      headers: { "User-Agent": "EarthOrbitVisualizer/1.0" },
    });
    if (!res.ok) throw new Error(`CelesTrak ${res.status}`);

    const text = await res.text();
    const tles = parseTLEText(text);
    const records = tles
      .slice(0, group.maxDisplay)
      .map((t) => tleToSatelliteRecord(t, group.id))
      .filter((r): r is SatelliteRecord => r !== null);

    memCache.set(group.id, { at: Date.now(), records });
    return NextResponse.json(records, { headers: CDN_CACHE_HEADERS });
  } catch (err) {
    if (cached) {
      // Upstream failed but we have expired data — stale beats nothing
      return NextResponse.json(cached.records, {
        headers: { ...CDN_CACHE_HEADERS, "X-Data-Stale": "true" },
      });
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
