"use client";
import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { propagateAt } from "@/lib/coordinates";
import type { SatelliteRecord } from "@/types/satellite";
import { SAT_MARKER_SIZE } from "@/lib/constants";
import { CATEGORY_MAP } from "@/lib/categories";

interface Props {
  satellites: SatelliteRecord[];
  simTime: Date;
  onSelect: (sat: SatelliteRecord) => void;
}

export function SatelliteCloud({ satellites, simTime, onSelect }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  const satrecCache = useMemo(
    () =>
      satellites.map((s) => {
        try {
          return satellite.twoline2satrec(s.line1, s.line2);
        } catch {
          return null;
        }
      }),
    [satellites]
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(satellites.length * 3);
    satellites.forEach((s, i) => {
      const hex = CATEGORY_MAP[s.category]?.color ?? "#ffffff";
      const c = new THREE.Color(hex);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [satellites]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = simTimeRef.current;

    satellites.forEach((_, i) => {
      const satrec = satrecCache[i];
      if (!satrec) {
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        return;
      }
      const pos = propagateAt(satrec, now);
      if (!pos) {
        dummy.scale.setScalar(0);
      } else {
        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.scale.setScalar(1);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = useCallback(
    (e: { instanceId?: number; stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      const id = e.instanceId;
      if (id != null && satellites[id]) onSelect(satellites[id]);
    },
    [satellites, onSelect]
  );

  if (!satellites.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, satellites.length]}
      onClick={handleClick as (e: { instanceId?: number }) => void}
    >
      <sphereGeometry args={[SAT_MARKER_SIZE, 6, 6]} />
      <meshBasicMaterial vertexColors />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
