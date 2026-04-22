import { NextRequest, NextResponse } from "next/server";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { parseTLEText, tleToSatelliteRecord } from "@/lib/tle";
import type { OrbitCategory } from "@/types/satellite";

// Edge runtime: works on both Vercel Edge and Cloudflare Pages
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") as OrbitCategory | null;
  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  const group = CELESTRAK_GROUPS.find((g) => g.id === category);
  if (!group) {
    return NextResponse.json({ error: "unknown category" }, { status: 400 });
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
      .map((t) => tleToSatelliteRecord(t, category))
      .filter(Boolean);

    return NextResponse.json(records, {
      headers: {
        // CDN (Vercel Edge / Cloudflare) caches for 1 hour; serves stale for 2 more
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
