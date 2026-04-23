"use client";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { EARTH_RADIUS_SCENE } from "@/lib/constants";

export function Earth() {
  const [dayMap, nightMap, cloudMap, normalMap] = useLoader(TextureLoader, [
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg",
    "/textures/earth-clouds.jpg",
    "/textures/earth-normal.jpg",
  ]);

  return (
    <group>
      {/* Earth surface — stationary in ECEF/scene space; sun light moves around it */}
      <mesh castShadow receiveShadow>
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
