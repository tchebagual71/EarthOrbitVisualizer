import { NextRequest, NextResponse } from "next/server";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { parseTLEText, tleToSatelliteRecord } from "@/lib/tle";
import type { OrbitCategory } from "@/types/satellite";

// In-memory cache per category; resets on cold start
const cache = new Map<string, { data: unknown[]; ts: number }>();
const CACHE_TTL_MS = 3600_000; // 1 hour

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") as OrbitCategory | null;
  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  const group = CELESTRAK_GROUPS.find((g) => g.id === category);
  if (!group) {
    return NextResponse.json({ error: "unknown category" }, { status: 400 });
  }

  const cached = cache.get(category);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const res = await fetch(group.url, {
      headers: { "User-Agent": "EarthOrbitVisualizer/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`CelesTrak ${res.status}`);

    const text = await res.text();
    const tles = parseTLEText(text);
    const records = tles
      .slice(0, group.maxDisplay)
      .map((t) => tleToSatelliteRecord(t, category))
      .filter(Boolean);

    cache.set(category, { data: records, ts: Date.now() });
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    cache.delete(category); // don't cache errors
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
