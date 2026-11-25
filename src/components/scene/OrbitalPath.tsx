"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { getOrbitPath, orbitFrameRotationY } from "@/lib/coordinates";
import { getSimTime } from "@/lib/simClock";
import { useStore } from "@/hooks/useStore";
import type { SatelliteRecord } from "@/types/satellite";
import { CATEGORY_MAP } from "@/lib/categories";

interface Props {
  sat: SatelliteRecord;
}

// The selected satellite's orbit as a closed inertial ellipse. The scene is
// Earth-fixed, so the ellipse is computed for one instant (re-propagated once
// per sim minute) and then turned westward every frame as the Earth rotates
// beneath it. The Earth-relative path is what GroundTrack shows.
export function OrbitalPath({ sat }: Props) {
  const simTime = useStore((s) => s.simTime);
  const color = CATEGORY_MAP[sat.category]?.color ?? "#ffffff";
  const groupRef = useRef<THREE.Group>(null);

  const simMinute = Math.floor(simTime.getTime() / 60_000);
  const path = useMemo(() => {
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      const computedAt = simTime;
      const pts = getOrbitPath(satrec, computedAt, 180);
      if (pts.length < 2) return null;
      return {
        computedAt,
        points: pts.map((p) => [p.x, p.y, p.z] as [number, number, number]),
      };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat.line1, sat.line2, simMinute]);

  useFrame(() => {
    if (groupRef.current && path) {
      groupRef.current.rotation.y = orbitFrameRotationY(path.computedAt, getSimTime());
    }
  });

  if (!path) return null;

  return (
    <group ref={groupRef}>
      <Line
        points={path.points}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.5}
        dashed={false}
      />
    </group>
  );
}
