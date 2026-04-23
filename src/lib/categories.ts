import type { CelestrakGroup } from "@/types/satellite";

const GP = (group: string) =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=TLE`;

const SUP = (file: string) =>
  `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=${file}&FORMAT=tle`;

export const CELESTRAK_GROUPS: CelestrakGroup[] = [
  {
    id: "stations",
    label: "Space Stations",
    url: GP("stations"),
    color: "#f59e0b",
    maxDisplay: 20,
  },
  {
    id: "starlink",
    label: "Starlink",
    url: SUP("starlink"),
    color: "#60a5fa",
    maxDisplay: 2000,
  },
  {
    id: "gps",
    label: "GPS",
    url: GP("gps-ops"),
    color: "#34d399",
    maxDisplay: 50,
  },
  {
    id: "weather",
    label: "Weather",
    url: GP("weather"),
    color: "#a78bfa",
    maxDisplay: 100,
  },
  {
    id: "geo",
    label: "GEO Belt",
    url: GP("geo"),
    color: "#fb923c",
    maxDisplay: 200,
  },
  {
    id: "amateur",
    label: "Amateur",
    url: GP("amateur"),
    color: "#f472b6",
    maxDisplay: 100,
  },
  {
    id: "debris",
    label: "Debris",
    url: GP("cosmos-2251-debris"),
    color: "#94a3b8",
    maxDisplay: 500,
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CELESTRAK_GROUPS.map((g) => [g.id, g])
) as Record<string, CelestrakGroup>;
