"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { inertialFrameRotationY } from "@/lib/coordinates";
import { getSimTime } from "@/lib/simClock";

// The star field belongs to the inertial frame. The scene is Earth-fixed, so
// the stars wheel westward once per sidereal day — just as the sun light
// already does.
export function Sky() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = inertialFrameRotationY(getSimTime());
    }
  });

  return (
    <group ref={groupRef}>
      <Stars radius={300} depth={60} count={6000} factor={5} saturation={0} fade />
    </group>
  );
}
