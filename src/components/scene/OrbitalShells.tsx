"use client";
import * as THREE from "three";
import { EARTH_RADIUS_KM, SCENE_SCALE_KM } from "@/lib/constants";
import { useStore } from "@/hooks/useStore";

export const SHELL_DEFS = [
  {
    altKm: 550,
    shortLabel: "Low Earth Orbit",
    label: "LEO — Starlink / ISS Belt",
    color: "#60a5fa",
    opacity: 0.04,
    period: "~90 min",
    velocity: "~7.6 km/s",
    inclination: "Any (28°–97°)",
    body: "The most active zone in space. At 550 km, Starlink operates ~6,000 satellites for global broadband. The ISS orbits lower at ~408 km. Orbital decay from atmospheric drag means satellites here naturally de-orbit within years — a self-cleaning mechanism that is increasingly stressed as constellation density grows.",
    examples: "ISS (408 km) · Starlink (550 km) · Hubble (540 km) · Landsat-9 (705 km)",
    facts: [
      "Astronauts on ISS see 16 sunrises per day",
      "A Starlink sat completes ~16 orbits daily",
      "Atmospheric drag causes ~2 km/yr altitude loss at 400 km",
      "~23,000 tracked debris objects currently orbit in LEO",
    ],
    risk: "Highest collision risk — Kessler cascade concern above 600 km",
  },
  {
    altKm: 2000,
    shortLabel: "Upper LEO / Van Allen boundary",
    label: "Upper LEO — Radiation Belt Boundary",
    color: "#818cf8",
    opacity: 0.03,
    period: "~127 min",
    velocity: "~6.9 km/s",
    inclination: "Varies",
    body: "This altitude marks the inner boundary of the Van Allen radiation belts — bands of high-energy charged particles trapped by Earth's magnetic field. Electronics degrade rapidly here, making it the least-used region in Earth orbit. Satellites that pass through (like GPS on eccentric orbits) use radiation-hardened components.",
    examples: "Van Allen Probes (historical) · Some reconnaissance sats",
    facts: [
      "Inner Van Allen belt peaks at ~3,000–4,000 km",
      "Proton flux 100× higher than at LEO",
      "Solar storms temporarily extend the belt to lower altitudes",
      "Crew must transit quickly — shuttle/Soyuz limit stays below 600 km",
    ],
    risk: "Intense radiation — most satellites avoid this zone",
  },
  {
    altKm: 20200,
    shortLabel: "Medium Earth Orbit",
    label: "MEO — Navigation Constellation Belt",
    color: "#34d399",
    opacity: 0.03,
    period: "~12 h",
    velocity: "~3.9 km/s",
    inclination: "~55°–65°",
    body: "MEO is the home of navigation. GPS, GLONASS, Galileo, and BeiDou all orbit here, completing exactly 2 orbits per day — a resonance with Earth that simplifies ground-station scheduling. The 20,200 km altitude was chosen because each satellite can see ~40% of Earth's surface, and 24 satellites provide continuous global coverage with 4+ sats always visible.",
    examples: "GPS Block III · Galileo FOC · GLONASS-M · BeiDou-3 IGSO",
    facts: [
      "GPS requires 4 satellites to compute a 3D fix",
      "Signal travel time from GPS sat to receiver: ~67 ms",
      "Galileo offers 20 cm accuracy vs GPS's ~3 m civilian accuracy",
      "A GPS satellite weighs ~900 kg and costs ~$500 M",
    ],
    risk: "Moderate radiation — radiation-hardened electronics required",
  },
  {
    altKm: 35786,
    shortLabel: "Geostationary Orbit",
    label: "GEO — Geostationary Ring",
    color: "#fb923c",
    opacity: 0.04,
    period: "24 h (synchronous)",
    velocity: "~3.07 km/s",
    inclination: "~0° (equatorial)",
    body: "The most strategically valuable orbit. At exactly 35,786 km, orbital period matches Earth's rotation — a satellite appears stationary in the sky. A single GEO satellite covers 42% of Earth's surface continuously. Slots are internationally regulated by the ITU; equatorial countries argue they should own the slots above their territory. A 'graveyard orbit' 300 km above GEO stores retired satellites.",
    examples: "GOES-16/18 (weather) · Intelsat 37e (comms) · Anik-F2 (Canada) · Inmarsat (maritime)",
    facts: [
      "Signal round-trip delay: ~600 ms — makes real-time gaming impossible",
      "Only 360° of longitude available — slots sell for $300 M+",
      "GEO sats cost $300 M–$500 M to build and launch",
      "A satellite here weighs the same on scales as a small car",
    ],
    risk: "Low collision risk but permanent debris — graveyard orbit convention",
  },
];

export function OrbitalShells() {
  const learningShell = useStore((s) => s.learningShell);

  return (
    <group>
      {SHELL_DEFS.map(({ altKm, color, opacity }, idx) => {
        const radius = (EARTH_RADIUS_KM + altKm) / SCENE_SCALE_KM;
        const isActive = learningShell === idx;
        return (
          // raycast={() => {}} makes the sphere invisible to the raycaster —
          // clicks pass straight through to launch site dots beneath.
          <mesh key={altKm} raycast={() => {}}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshBasicMaterial
              color={new THREE.Color(color)}
              transparent
              opacity={isActive ? opacity * 5 : opacity}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
