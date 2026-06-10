"use client";
import { useMemo } from "react";
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

// Stable empty array so disabled/unloaded categories don't churn identity
const NO_SATELLITES: SatelliteRecord[] = [];

export interface TLEDataResult {
  satellites: SatelliteRecord[];
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

// Single-category hook — safe to call unconditionally. Pass enabled=false to
// skip fetching (SWR null key) while keeping the hook call in place.
export function useTLEData(category: OrbitCategory, enabled = true): TLEDataResult {
  const { data, error, isLoading, mutate } = useSWR<SatelliteRecord[]>(
    enabled ? `/api/satellites?category=${category}` : null,
    fetcher,
    SWR_OPTS
  );
  return useMemo(
    () => ({
      satellites: data ?? NO_SATELLITES,
      isLoading,
      error: error ?? null,
      retry: () => void mutate(),
    }),
    [data, isLoading, error, mutate]
  );
}

// Always calls all 7 hooks (fixed count) — disabled categories use a null SWR
// key so they aren't fetched. The merged result is memoized: consumers receive
// a stable array identity unless the underlying data or enabled set changes.
export function useAllTLEData(enabled: Set<OrbitCategory>): TLEDataResult {
  const stations = useTLEData("stations", enabled.has("stations"));
  const starlink = useTLEData("starlink", enabled.has("starlink"));
  const gps      = useTLEData("gps",      enabled.has("gps"));
  const weather  = useTLEData("weather",  enabled.has("weather"));
  const geo      = useTLEData("geo",      enabled.has("geo"));
  const amateur  = useTLEData("amateur",  enabled.has("amateur"));
  const debris   = useTLEData("debris",   enabled.has("debris"));

  return useMemo(() => {
    const all: Record<OrbitCategory, TLEDataResult> = {
      stations, starlink, gps, weather, geo, amateur, debris,
    };
    const active = (Object.keys(all) as OrbitCategory[]).filter((c) => enabled.has(c));
    return {
      satellites: active.flatMap((c) => all[c].satellites),
      isLoading:  active.some((c) => all[c].isLoading),
      error:      active.map((c) => all[c].error).find(Boolean) ?? null,
      retry:      () => active.forEach((c) => { if (all[c].error) all[c].retry(); }),
    };
  }, [stations, starlink, gps, weather, geo, amateur, debris, enabled]);
}
