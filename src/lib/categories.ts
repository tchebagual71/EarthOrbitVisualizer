import type { CelestrakGroup } from "@/types/satellite";

const GP = (group: string) =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=TLE`;

const SUP = (file: string) =>
  `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=${file}&FORMAT=tle`;

// Single source of truth for satellite categories. OrbitCategory, the default
// enabled set (useStore), and CATEGORY_MAP all derive from this list; the
// per-category hooks in useAllTLEData are exhaustiveness-checked against
// OrbitCategory, so adding an entry here turns every remaining required
// change into a compile error rather than a silent omission.
export const CELESTRAK_GROUPS = [
  {
    id: "stations",
    label: "Space Stations",
    urls: [GP("stations")],
    color: "#f59e0b",
    maxDisplay: 50,
  },
  {
    id: "starlink",
    label: "Starlink",
    urls: [SUP("starlink")],
    color: "#60a5fa",
    maxDisplay: 15000,
  },
  {
    id: "oneweb",
    label: "OneWeb",
    urls: [GP("oneweb")],
    color: "#22d3ee",
    maxDisplay: 1000,
  },
  {
    id: "gps",
    label: "Navigation (GNSS)",
    urls: [GP("gnss")],
    color: "#34d399",
    maxDisplay: 250,
  },
  {
    id: "weather",
    label: "Weather",
    urls: [GP("weather")],
    color: "#a78bfa",
    maxDisplay: 150,
  },
  {
    id: "geo",
    label: "GEO Belt",
    urls: [GP("geo")],
    color: "#fb923c",
    maxDisplay: 1000,
  },
  {
    id: "amateur",
    label: "Amateur",
    urls: [GP("amateur")],
    color: "#f472b6",
    maxDisplay: 200,
  },
  {
    // Everything else that is operational. The mega-constellations are
    // dropped server-side to keep the payload down; whatever still overlaps
    // an earlier category is de-duplicated client-side (first category wins).
    id: "other",
    label: "Other Active",
    urls: [GP("active")],
    color: "#e2e8f0",
    maxDisplay: 8000,
    excludeName: /^(STARLINK|ONEWEB)/i,
  },
  {
    // The four largest fragmentation events still on orbit
    id: "debris",
    label: "Debris",
    urls: [
      GP("cosmos-2251-debris"),
      GP("iridium-33-debris"),
      GP("fengyun-1c-debris"),
      GP("cosmos-1408-debris"),
    ],
    color: "#94a3b8",
    maxDisplay: 6000,
  },
] as const;

export type OrbitCategory = (typeof CELESTRAK_GROUPS)[number]["id"];

export const ORBIT_CATEGORIES: readonly OrbitCategory[] = CELESTRAK_GROUPS.map(
  (g) => g.id
);

export const CATEGORY_MAP = Object.fromEntries(
  CELESTRAK_GROUPS.map((g): [OrbitCategory, CelestrakGroup] => [g.id, g])
) as Record<OrbitCategory, CelestrakGroup>;
