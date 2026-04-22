import type { CelestrakGroup } from "@/types/satellite";

const GP = (group: string) =>
  `https://celestrak.org/SATCAT/gp.php?GROUP=${group}&FORMAT=TLE`;

export const CELESTRAK_GROUPS: CelestrakGroup[] = [
  {
    id: "stations",
    label: "Space Stations",
    url: GP("STATIONS"),
    color: "#f59e0b",
    maxDisplay: 20,
  },
  {
    id: "starlink",
    label: "Starlink",
    url: "https://celestrak.org/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle",
    color: "#60a5fa",
    maxDisplay: 2000,
  },
  {
    id: "gps",
    label: "GPS",
    url: GP("GPS-OPS"),
    color: "#34d399",
    maxDisplay: 50,
  },
  {
    id: "weather",
    label: "Weather",
    url: GP("WEATHER"),
    color: "#a78bfa",
    maxDisplay: 100,
  },
  {
    id: "geo",
    label: "GEO Belt",
    url: GP("GEO"),
    color: "#fb923c",
    maxDisplay: 200,
  },
  {
    id: "amateur",
    label: "Amateur",
    url: GP("AMATEUR"),
    color: "#f472b6",
    maxDisplay: 100,
  },
  {
    id: "debris",
    label: "Debris",
    url: GP("COSMOS-2251-DEB"),
    color: "#94a3b8",
    maxDisplay: 500,
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CELESTRAK_GROUPS.map((g) => [g.id, g])
) as Record<string, CelestrakGroup>;
