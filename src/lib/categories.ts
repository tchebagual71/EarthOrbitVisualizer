import type { CelestrakGroup } from "@/types/satellite";

export const CELESTRAK_GROUPS: CelestrakGroup[] = [
  {
    id: "stations",
    label: "Space Stations",
    url: "https://celestrak.org/SATCAT/groups/stations.txt",
    color: "#f59e0b",
    maxDisplay: 20,
  },
  {
    id: "starlink",
    label: "Starlink",
    url: "https://celestrak.org/SATCAT/groups/starlink.txt",
    color: "#60a5fa",
    maxDisplay: 2000,
  },
  {
    id: "gps",
    label: "GPS",
    url: "https://celestrak.org/SATCAT/groups/gps-ops.txt",
    color: "#34d399",
    maxDisplay: 50,
  },
  {
    id: "weather",
    label: "Weather",
    url: "https://celestrak.org/SATCAT/groups/weather.txt",
    color: "#a78bfa",
    maxDisplay: 100,
  },
  {
    id: "geo",
    label: "GEO Belt",
    url: "https://celestrak.org/SATCAT/groups/geo.txt",
    color: "#fb923c",
    maxDisplay: 200,
  },
  {
    id: "amateur",
    label: "Amateur",
    url: "https://celestrak.org/SATCAT/groups/amateur.txt",
    color: "#f472b6",
    maxDisplay: 100,
  },
  {
    id: "debris",
    label: "Debris",
    url: "https://celestrak.org/SATCAT/groups/cosmos-2251-debris.txt",
    color: "#94a3b8",
    maxDisplay: 500,
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CELESTRAK_GROUPS.map((g) => [g.id, g])
) as Record<string, CelestrakGroup>;
