"use client";
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as satellite from "satellite.js";
import { useStore } from "@/hooks/useStore";
import type { SatelliteRecord } from "@/types/satellite";
import { getGroundTrack } from "@/lib/coordinates";

interface Props {
  sat: SatelliteRecord;
}

export function GroundTrack({ sat }: Props) {
  const simTime = useStore((s) => s.simTime);

  // Recompute at most once per sim minute — the track shifts slowly and the
  // 120-step propagation is too expensive to run on every time tick.
  const simMinute = Math.floor(simTime.getTime() / 60_000);
  const points = useMemo(() => {
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      const track = getGroundTrack(satrec, simTime, 120);
      if (track.length < 2) return null;
      return track.map((p) => [p.x, p.y, p.z] as [number, number, number]);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat.line1, sat.line2, simMinute]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color="#facc15"
      lineWidth={1}
      transparent
      opacity={0.55}
      dashed={false}
    />
  );
}
