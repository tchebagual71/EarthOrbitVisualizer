"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SatelliteRecord } from "@/types/satellite";

const TAP_THRESHOLD_PX = 44; // Apple HIG minimum tap target

interface Props {
  satellites: SatelliteRecord[];
  positionsRef: React.MutableRefObject<Float32Array>;
  posValidRef: React.MutableRefObject<Uint8Array>;
  tapPos: { x: number; y: number } | null;
  onSelect: (sat: SatelliteRecord) => void;
  onClearTap: () => void;
}

const _vec = new THREE.Vector3();

export function SatelliteSelector({
  satellites,
  positionsRef,
  posValidRef,
  tapPos,
  onSelect,
  onClearTap,
}: Props) {
  const { camera, size, gl } = useThree();

  useEffect(() => {
    if (!tapPos || !satellites.length) return;

    const rect = gl.domElement.getBoundingClientRect();
    const canvasX = tapPos.x - rect.left;
    const canvasY = tapPos.y - rect.top;

    let nearestDist = TAP_THRESHOLD_PX;
    let nearestIdx = -1;

    const positions = positionsRef.current;
    const valid = posValidRef.current;

    for (let i = 0; i < satellites.length; i++) {
      if (!valid[i]) continue;

      _vec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      _vec.project(camera);

      if (_vec.z > 1) continue; // behind camera

      const sx = ((_vec.x + 1) / 2) * size.width;
      const sy = ((1 - _vec.y) / 2) * size.height;
      const dist = Math.hypot(sx - canvasX, sy - canvasY);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx >= 0) onSelect(satellites[nearestIdx]);
    onClearTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPos]);

  return null;
}
