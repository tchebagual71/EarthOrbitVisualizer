"use client";
import { useCallback, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { EARTH_RADIUS_SCENE } from "@/lib/constants";
import { getSunDirectionScene } from "@/lib/solar";
import { getSimTime } from "@/lib/simClock";

// Cloud layer drift relative to the surface, radians per sim-hour.
// Deterministic in sim time so scrubbing/rewind stay consistent.
const CLOUD_DRIFT_RAD_PER_SIM_HOUR = 0.01;

export function Earth() {
  const [dayMap, nightMap, cloudMap, normalMap] = useLoader(TextureLoader, [
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg",
    "/textures/earth-clouds.jpg",
    "/textures/earth-normal.jpg",
  ]);

  const cloudsRef = useRef<THREE.Mesh>(null);
  // Sun direction in *view* space, shared with the shader uniform by reference
  const sunDirView = useRef(new THREE.Vector3(1, 0, 0));

  // Gate the night-lights emissive map to the dark side of the terminator.
  // Patching Phong keeps its lighting + normal-map pipeline intact.
  const onBeforeCompile = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSunDirView = { value: sunDirView.current };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSunDirView;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // City lights fade in across the terminator and vanish on the day side
        totalEmissiveRadiance *= smoothstep(0.05, -0.18, dot(normalize(normal), uSunDirView));`
      );
  }, []);

  useFrame(({ camera }) => {
    const simTime = getSimTime();
    const dir = getSunDirectionScene(simTime);
    // World → view space; the shader's `normal` is in view space
    sunDirView.current.set(dir.x, dir.y, dir.z).transformDirection(camera.matrixWorldInverse);

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y =
        ((simTime.getTime() / 3_600_000) * CLOUD_DRIFT_RAD_PER_SIM_HOUR) % (2 * Math.PI);
    }
  });

  return (
    <group>
      {/* Earth surface — stationary in ECEF/scene space; sun light moves around it */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS_SCENE, 64, 64]} />
        <meshPhongMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0xffe0b3)}
          emissiveIntensity={1.0}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          specular={new THREE.Color(0x333333)}
          shininess={15}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
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
