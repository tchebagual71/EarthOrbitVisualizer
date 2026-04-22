"use client";
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as satellite from "satellite.js";
import { getOrbitPath } from "@/lib/coordinates";
import type { SatelliteRecord } from "@/types/satellite";
import { CATEGORY_MAP } from "@/lib/categories";

interface Props {
  sat: SatelliteRecord;
  simTime: Date;
}

export function OrbitalPath({ sat, simTime }: Props) {
  const color = CATEGORY_MAP[sat.category]?.color ?? "#ffffff";

  const simMinute = Math.floor(simTime.getTime() / 60_000);
  const points = useMemo(() => {
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      const path = getOrbitPath(satrec, simTime, 90);
      if (path.length < 2) return null;
      return path.map((p) => [p.x, p.y, p.z] as [number, number, number]);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat.line1, sat.line2, simMinute]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.5}
      dashed={false}
    />
  );
}
