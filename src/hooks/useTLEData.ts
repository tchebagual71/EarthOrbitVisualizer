"use client";
import useSWR from "swr";
import type { SatelliteRecord, OrbitCategory } from "@/types/satellite";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface TLEDataResult {
  satellites: SatelliteRecord[];
  isLoading: boolean;
  error: Error | null;
}

export function useTLEData(category: OrbitCategory): TLEDataResult {
  const { data, error, isLoading } = useSWR<SatelliteRecord[]>(
    `/api/satellites?category=${category}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600_000, // 1 hour
    }
  );

  return {
    satellites: data ?? [],
    isLoading,
    error: error ?? null,
  };
}

export function useAllTLEData(categories: OrbitCategory[]): TLEDataResult {
  const results = categories.map((c) => useTLEData(c)); // eslint-disable-line react-hooks/rules-of-hooks
  const satellites = results.flatMap((r) => r.satellites);
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;
  return { satellites, isLoading, error };
}
