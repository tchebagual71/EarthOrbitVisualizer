"use client";
import { useMemo } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { propagateAt } from "@/lib/coordinates";
import { useStore } from "@/hooks/useStore";
import type { SatelliteRecord } from "@/types/satellite";
import { CATEGORY_MAP } from "@/lib/categories";

interface Props {
  sat: SatelliteRecord;
}

const TRAIL_MINUTES = 30;
const TRAIL_STEPS = 90; // one point every 20 seconds

export function SatelliteTrail({ sat }: Props) {
  const simTime = useStore((s) => s.simTime);
  const color = CATEGORY_MAP[sat.category]?.color ?? "#ffffff";

  // Recompute every 20 sim-seconds to keep trail smooth during fast forward
  const simSlice = Math.floor(simTime.getTime() / 20_000);

  const lineObj = useMemo(() => {
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      const positions: number[] = [];
      const colors: number[] = [];
      const base = new THREE.Color(color);

      for (let i = 0; i <= TRAIL_STEPS; i++) {
        const t = i / TRAIL_STEPS; // 0 = oldest, 1 = current
        const time = new Date(simTime.getTime() - (1 - t) * TRAIL_MINUTES * 60_000);
        const pos = propagateAt(satrec, time);
        if (!pos) continue;
        positions.push(pos.x, pos.y, pos.z);
        // Fade from black → full color, so tail vanishes naturally
        colors.push(base.r * t, base.g * t, base.b * t);
      }

      if (positions.length < 6) return null; // need at least 2 points

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 });
      return new THREE.Line(geo, mat);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat.line1, sat.line2, simSlice, color]);

  if (!lineObj) return null;
  return <primitive object={lineObj} />;
}
