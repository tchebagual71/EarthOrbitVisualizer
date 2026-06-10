"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSunDirectionScene } from "@/lib/solar";
import { getSimTime } from "@/lib/simClock";

const SUN_DISTANCE = 150; // scene units — far enough to act as parallel light

export function SunLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    const dir = getSunDirectionScene(getSimTime());
    lightRef.current.position.set(
      dir.x * SUN_DISTANCE,
      dir.y * SUN_DISTANCE,
      dir.z * SUN_DISTANCE
    );
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={1.4}
      castShadow={false}
    />
  );
}
