"use client";
import useSWR from "swr";
import type { SatelliteRecord, OrbitCategory } from "@/types/satellite";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

const SWR_OPTS = {
  revalidateOnFocus: false,
  dedupingInterval: 3600_000,
};

export interface TLEDataResult {
  satellites: SatelliteRecord[];
  isLoading: boolean;
  error: Error | null;
}

// Single-category hook — safe to call unconditionally
export function useTLEData(category: OrbitCategory): TLEDataResult {
  const { data, error, isLoading } = useSWR<SatelliteRecord[]>(
    `/api/satellites?category=${category}`,
    fetcher,
    SWR_OPTS
  );
  return { satellites: data ?? [], isLoading, error: error ?? null };
}

// Always calls all 7 hooks (fixed count) — filters by enabled set after
export function useAllTLEData(enabled: Set<OrbitCategory>): TLEDataResult {
  const stations = useTLEData("stations");
  const starlink = useTLEData("starlink");
  const gps      = useTLEData("gps");
  const weather  = useTLEData("weather");
  const geo      = useTLEData("geo");
  const amateur  = useTLEData("amateur");
  const debris   = useTLEData("debris");

  const all: Record<OrbitCategory, TLEDataResult> = {
    stations, starlink, gps, weather, geo, amateur, debris,
  };

  const active = (Object.keys(all) as OrbitCategory[]).filter((c) => enabled.has(c));
  const satellites = active.flatMap((c) => all[c].satellites);
  const isLoading  = active.some((c) => all[c].isLoading);
  const errorEntry = active.find((c) => all[c].error);
  const error      = errorEntry ? all[errorEntry].error : null;

  return { satellites, isLoading, error };
}
