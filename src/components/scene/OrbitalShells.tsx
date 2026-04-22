"use client";
import * as THREE from "three";
import { EARTH_RADIUS_KM, SCENE_SCALE_KM } from "@/lib/constants";

const shells = [
  { altKm: 550, label: "LEO (Starlink ~550km)", color: "#60a5fa", opacity: 0.04 },
  { altKm: 2000, label: "LEO max 2000km", color: "#818cf8", opacity: 0.03 },
  { altKm: 20200, label: "MEO (GPS ~20200km)", color: "#34d399", opacity: 0.03 },
  { altKm: 35786, label: "GEO 35786km", color: "#fb923c", opacity: 0.04 },
];

export function OrbitalShells() {
  return (
    <group>
      {shells.map(({ altKm, color, opacity }) => {
        const radius = (EARTH_RADIUS_KM + altKm) / SCENE_SCALE_KM;
        return (
          <mesh key={altKm}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshBasicMaterial
              color={new THREE.Color(color)}
              transparent
              opacity={opacity}
              side={THREE.FrontSide}
              depthWrite={false}
              wireframe={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
