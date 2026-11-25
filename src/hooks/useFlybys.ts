"use client";
import useSWR from "swr";
import type { Flyby } from "@/lib/flybys";

const NO_FLYBYS: Flyby[] = [];

const fetcher = (url: string): Promise<{ flybys: Flyby[] }> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export interface FlybysResult {
  flybys: Flyby[];
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

// Upcoming asteroid close approaches (NASA/JPL, via /api/flybys). Not fetched
// until enabled.
export function useFlybys(enabled: boolean): FlybysResult {
  const { data, error, isLoading, mutate } = useSWR(enabled ? "/api/flybys" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600_000,
  });
  return {
    flybys: data?.flybys ?? NO_FLYBYS,
    isLoading,
    error: error ?? null,
    retry: () => void mutate(),
  };
}
