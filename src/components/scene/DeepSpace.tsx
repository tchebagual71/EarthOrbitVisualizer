"use client";
import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { eciKmToInertialScene, inertialFrameRotationY } from "@/lib/coordinates";
import { flybyPositionAt, formatLunarDistances, type Flyby } from "@/lib/flybys";
import { getMoonEci } from "@/lib/moon";
import { getSimMs, getSimTime } from "@/lib/simClock";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";

const MOON_RADIUS_SCENE = 1.7374;
const MOON_ORBIT_DAYS = 27.4;
// Labels only make sense once the camera has pulled back from the satellites
const FAR_VIEW_DISTANCE = 150;
// Html labels must sit under the HUD panels (z-20)
const LABEL_Z: [number, number] = [5, 0];

type Vec3 = [number, number, number];

const toVec3 = (p: { x: number; y: number; z: number }): Vec3 => {
  const s = eciKmToInertialScene(p);
  return [s.x, s.y, s.z];
};

const caDate = (ms: number): string =>
  new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Html center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
      <div className={cn("flex flex-col items-center whitespace-nowrap select-none", className)}>
        {children}
      </div>
    </Html>
  );
}

// Everything beyond the satellite belts: the Moon and its orbit (for scale)
// and the asteroids passing the Earth. All of it is inertial, so it lives in
// a group that turns with the sky inside the Earth-fixed scene.
export function DeepSpace({ flybys }: { flybys: Flyby[] }) {
  const selectedFlyby = useStore((s) => s.selectedFlyby);
  // Day-granular: only used to refresh the drawn month of lunar orbit
  const simDay = useStore((s) => Math.floor(s.simTime.getTime() / 86_400_000));

  const groupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const [far, setFar] = useState(false);
  const farRef = useRef(false);

  const moonOrbit = useMemo(() => {
    const pts: Vec3[] = [];
    const start = simDay * 86_400_000;
    for (let h = 0; h <= MOON_ORBIT_DAYS * 24; h += 6) {
      pts.push(toVec3(getMoonEci(new Date(start + h * 3_600_000))));
    }
    return pts;
  }, [simDay]);

  const tracks = useMemo(
    () =>
      flybys.flatMap((f) => {
        if (!f.path) return [];
        const points: Vec3[] = [];
        for (let i = 0; i < f.path.xyz.length; i += 3) {
          points.push(toVec3({ x: f.path.xyz[i], y: f.path.xyz[i + 1], z: f.path.xyz[i + 2] }));
        }
        const ca = flybyPositionAt(f.path, f.caTimeMs);
        return ca ? [{ flyby: f, path: f.path, points, closest: toVec3(ca) }] : [];
      }),
    [flybys]
  );

  // Live asteroid positions: one constant-pixel-size point each
  const liveGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tracks.length * 3), 3));
    return geo;
  }, [tracks]);

  useFrame(({ camera }) => {
    const nowMs = getSimMs();
    if (groupRef.current) groupRef.current.rotation.y = inertialFrameRotationY(getSimTime());
    if (moonRef.current) {
      const m = toVec3(getMoonEci(new Date(nowMs)));
      moonRef.current.position.set(m[0], m[1], m[2]);
    }

    const attr = liveGeometry.getAttribute("position") as THREE.BufferAttribute;
    tracks.forEach((t, i) => {
      const p = flybyPositionAt(t.path, nowMs);
      // Outside its sampled window an asteroid is parked inside the Earth,
      // where it can't be seen
      const v = p ? toVec3(p) : [0, 0, 0];
      attr.setXYZ(i, v[0], v[1], v[2]);
    });
    attr.needsUpdate = true;

    const isFar = camera.position.length() > FAR_VIEW_DISTANCE;
    if (isFar !== farRef.current) {
      farRef.current = isFar;
      setFar(isFar);
    }
  });

  return (
    <group ref={groupRef}>
      {far && (
        <Label className="text-[10px] text-sky-300">
          <span className="h-2 w-2 rounded-full border border-sky-300" />
          Earth
        </Label>
      )}

      <Line points={moonOrbit} color="#94a3b8" lineWidth={1} transparent opacity={0.35} />
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[MOON_RADIUS_SCENE, 32, 32]} />
          <meshStandardMaterial color="#b8b8b8" roughness={1} />
        </mesh>
        {far && (
          <Label className="text-[10px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            Moon
          </Label>
        )}
      </group>

      {tracks.map(({ flyby, points, closest }) => {
        const selected = flyby.des === selectedFlyby;
        return (
          <group key={flyby.des}>
            <Line
              points={points}
              color={selected ? "#fde047" : "#f59e0b"}
              lineWidth={selected ? 2 : 1}
              transparent
              opacity={selected ? 0.95 : 0.3}
            />
            {far && (
              <group position={closest}>
                <Label
                  className={cn(
                    "text-[10px] leading-tight",
                    selected ? "text-yellow-200 font-semibold" : "text-amber-400/80"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-yellow-200" : "bg-amber-400/80")} />
                  {flyby.name}
                  {selected && (
                    <span className="font-normal text-yellow-100/80">
                      closest {caDate(flyby.caTimeMs)} · {formatLunarDistances(flyby.distKm)}
                    </span>
                  )}
                </Label>
              </group>
            )}
          </group>
        );
      })}

      <points geometry={liveGeometry} frustumCulled={false}>
        <pointsMaterial color="#ffffff" size={6} sizeAttenuation={false} />
      </points>
    </group>
  );
}
