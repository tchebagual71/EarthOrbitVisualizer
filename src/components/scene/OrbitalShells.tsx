"use client";
import * as THREE from "three";
import { EARTH_RADIUS_KM, SCENE_SCALE_KM } from "@/lib/constants";
import { useStore } from "@/hooks/useStore";

export const SHELL_DEFS = [
  {
    altKm: 550,
    label: "LEO — Starlink / ISS Belt (~550 km)",
    color: "#60a5fa",
    opacity: 0.04,
    body: "Low Earth Orbit is humanity's most-used highway to space. At 550 km above Earth, Starlink's ~6,000 satellites deliver broadband. The ISS orbits a bit lower at ~408 km. One orbit takes just 90 minutes, meaning astronauts see 16 sunrises per day.",
    period: "~90 min",
    velocity: "~7.6 km/s",
    examples: "ISS, Starlink, Hubble, Landsat",
  },
  {
    altKm: 2000,
    label: "Upper LEO — Radiation Belt Boundary (~2000 km)",
    color: "#818cf8",
    opacity: 0.03,
    body: "The upper edge of LEO marks the inner boundary of the Van Allen radiation belts. Few operational satellites use this altitude — the intense radiation shortens spacecraft lifetimes. This is the transition zone between LEO and MEO.",
    period: "~127 min",
    velocity: "~6.9 km/s",
    examples: "Some Earth-imaging constellations",
  },
  {
    altKm: 20200,
    label: "MEO — GPS Constellation (~20 200 km)",
    color: "#34d399",
    opacity: 0.03,
    body: "Medium Earth Orbit is the domain of navigation satellites. GPS, GLONASS, Galileo, and BeiDou all orbit here, completing ~2 orbits per day. The altitude was chosen to maximise coverage geometry: each satellite can 'see' about 40% of Earth's surface.",
    period: "~12 h",
    velocity: "~3.9 km/s",
    examples: "GPS Block III, Galileo, GLONASS, BeiDou",
  },
  {
    altKm: 35786,
    label: "GEO — Geostationary Belt (~35 786 km)",
    color: "#fb923c",
    opacity: 0.04,
    body: "The geostationary ring is the most valuable 'address' in space. A satellite here matches Earth's rotation, appearing fixed in the sky — perfect for TV broadcast, weather imaging, and communications. There are fewer than 500 active GEO sats, and slots are internationally regulated.",
    period: "24 h (synchronous)",
    velocity: "~3.07 km/s",
    examples: "GOES weather, DirecTV, Intelsat, Starlink V2",
  },
];

export function OrbitalShells() {
  const { learningShell, setLearningShell } = useStore();

  return (
    <group>
      {SHELL_DEFS.map(({ altKm, color, opacity }, idx) => {
        const radius = (EARTH_RADIUS_KM + altKm) / SCENE_SCALE_KM;
        const isActive = learningShell === idx;

        return (
          <mesh
            key={altKm}
            onClick={(e) => {
              e.stopPropagation();
              setLearningShell(isActive ? null : idx);
            }}
          >
            <sphereGeometry args={[radius, 48, 48]} />
            <meshBasicMaterial
              color={new THREE.Color(color)}
              transparent
              opacity={isActive ? opacity * 4 : opacity}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
