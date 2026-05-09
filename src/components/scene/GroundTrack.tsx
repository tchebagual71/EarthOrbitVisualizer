"use client";
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as satellite from "satellite.js";
import type { SatelliteRecord } from "@/types/satellite";
import { getGroundTrack } from "@/lib/coordinates";

interface Props {
  sat: SatelliteRecord;
  simTime: Date;
}

export function GroundTrack({ sat, simTime }: Props) {
  const points = useMemo(() => {
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      const track = getGroundTrack(satrec, simTime, 120);
      if (track.length < 2) return null;
      return track.map((p) => [p.x, p.y, p.z] as [number, number, number]);
    } catch {
      return null;
    }
  }, [sat.line1, sat.line2, simTime]);

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
