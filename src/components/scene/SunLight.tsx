"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/hooks/useStore";
import { getSunDirectionScene } from "@/lib/solar";

const SUN_DISTANCE = 150; // scene units — far enough to act as parallel light

export function SunLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    const simTime = useStore.getState().simTime;
    const dir = getSunDirectionScene(simTime);
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
