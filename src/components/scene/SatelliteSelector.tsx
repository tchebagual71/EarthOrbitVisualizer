"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SatelliteRecord } from "@/types/satellite";
import { isOccludedByEarth } from "@/lib/coordinates";

const TAP_THRESHOLD_PX = 44; // Apple HIG minimum tap target

interface Props {
  satellites: SatelliteRecord[];
  positionsRef: React.MutableRefObject<Float32Array>;
  posValidRef: React.MutableRefObject<Uint8Array>;
  tapPos: { x: number; y: number } | null;
  // null = the tap hit empty space (or only hidden satellites)
  onSelect: (sat: SatelliteRecord | null) => void;
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
    if (!tapPos) return;

    const rect = gl.domElement.getBoundingClientRect();
    const canvasX = tapPos.x - rect.left;
    const canvasY = tapPos.y - rect.top;

    let nearestDist = TAP_THRESHOLD_PX;
    let nearestIdx = -1;

    const positions = positionsRef.current;
    const valid = posValidRef.current;

    const n = Math.min(satellites.length, valid.length, Math.floor(positions.length / 3));
    for (let i = 0; i < n; i++) {
      if (!valid[i]) continue;

      _vec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      // Satellites hidden behind the globe are not pickable
      if (isOccludedByEarth(camera.position, _vec)) continue;

      _vec.applyMatrix4(camera.matrixWorldInverse);
      if (_vec.z > -camera.near) continue; // behind the camera
      _vec.applyMatrix4(camera.projectionMatrix);

      const sx = ((_vec.x + 1) / 2) * size.width;
      const sy = ((1 - _vec.y) / 2) * size.height;
      const dist = Math.hypot(sx - canvasX, sy - canvasY);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    onSelect(nearestIdx >= 0 ? satellites[nearestIdx] : null);
    onClearTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPos]);

  return null;
}
