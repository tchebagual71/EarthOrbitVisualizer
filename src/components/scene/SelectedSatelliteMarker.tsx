"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { propagateAt } from "@/lib/coordinates";
import { getSimTime } from "@/lib/simClock";
import { CATEGORY_MAP } from "@/lib/categories";
import { SAT_MARKER_SIZE } from "@/lib/constants";
import type { SatelliteRecord } from "@/types/satellite";

// A pulsing reticle locked to the selected satellite's live position so the
// selection is visible among thousands of dots. Fixed world size (like the
// satellite markers) so it stays proportional to the dot at any zoom.
export function SelectedSatelliteMarker({ sat }: { sat: SatelliteRecord }) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const color = CATEGORY_MAP[sat.category]?.color ?? "#ffffff";

  const satrec = useMemo(() => {
    try {
      return satellite.twoline2satrec(sat.line1, sat.line2);
    } catch {
      return null;
    }
  }, [sat.line1, sat.line2]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group || !satrec) return;
    const pos = propagateAt(satrec, getSimTime());
    if (!pos) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.position.set(pos.x, pos.y, pos.z);
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1 + 0.3 * Math.sin(clock.elapsedTime * 4));
    }
  });

  return (
    <group ref={groupRef}>
      {/* Soft pulsing halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[SAT_MARKER_SIZE * 3.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* Crisp wireframe shell reads as a selection reticle */}
      <mesh>
        <sphereGeometry args={[SAT_MARKER_SIZE * 2, 12, 12]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}
