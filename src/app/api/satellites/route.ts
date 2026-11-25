import { NextRequest, NextResponse } from "next/server";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { recordsFromTLETexts } from "@/lib/tle";
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
    // A category may merge several CelesTrak files; one missing file
    // shouldn't take the whole category down, so only fail if all do.
    const settled = await Promise.allSettled(
      group.urls.map(async (url) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "EarthOrbitVisualizer/1.0" },
        });
        if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
        return res.text();
      })
    );
    const texts = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (!texts.length) {
      const first = settled.find((r) => r.status === "rejected");
      throw first?.reason instanceof Error ? first.reason : new Error("CelesTrak unreachable");
    }

    const records = recordsFromTLETexts(texts, group);
    // CelesTrak answers unknown groups / rate limits with a 200 text body
    if (!records.length) throw new Error("CelesTrak returned no TLE data");

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
