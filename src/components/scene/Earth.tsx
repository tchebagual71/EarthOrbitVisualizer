"use client";
import { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { EARTH_RADIUS_SCENE } from "@/lib/constants";

export function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Textures loaded from NASA Blue Marble (served locally)
  const [dayMap, nightMap, cloudMap, normalMap] = useLoader(TextureLoader, [
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg",
    "/textures/earth-clouds.jpg",
    "/textures/earth-normal.jpg",
  ]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.005; // slow auto-rotation
    }
  });

  return (
    <group>
      {/* Earth surface */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS_SCENE, 64, 64]} />
        <meshPhongMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0x334466)}
          emissiveIntensity={0.8}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          specular={new THREE.Color(0x333333)}
          shininess={15}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_SCENE * 1.005, 64, 64]} />
        <meshPhongMaterial
          map={cloudMap}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_SCENE * 1.02, 64, 64]} />
        <meshPhongMaterial
          color={new THREE.Color(0x3399ff)}
          transparent
          opacity={0.06}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
