"use client";
import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Earth } from "./Earth";
import { OrbitalShells } from "./OrbitalShells";
import { SatelliteCloud } from "./SatelliteCloud";
import { OrbitalPath } from "./OrbitalPath";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import type { SatelliteRecord } from "@/types/satellite";

export function SceneCanvas() {
  const { simTime, playing, timeSpeed, setSimTime, selectedSat, setSelectedSat, showOrbitPath, enabledCategories } = useStore();
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  // Advance simulation clock
  useEffect(() => {
    if (!playing || timeSpeed === 0) return;
    const tick = (ts: number) => {
      if (lastTs.current !== null) {
        const realDelta = ts - lastTs.current; // ms
        const simDelta = realDelta * timeSpeed;
        setSimTime(new Date(simTime.getTime() + simDelta));
      }
      lastTs.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTs.current = null;
    };
  }, [playing, timeSpeed, simTime, setSimTime]);

  const { satellites } = useAllTLEData(enabledCategories);

  const handleSelect = useCallback(
    (sat: SatelliteRecord) => setSelectedSat(sat),
    [setSelectedSat]
  );

  const handleBgClick = useCallback(() => setSelectedSat(null), [setSelectedSat]);

  return (
    <Canvas
      camera={{ position: [0, 0, 25], fov: 45, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#000008" }}
      onPointerMissed={handleBgClick}
    >
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[50, 20, 30]}
        intensity={1.4}
        castShadow
      />

      <Stars radius={300} depth={60} count={6000} factor={5} saturation={0} fade />

      <Suspense fallback={null}>
        <Earth />
      </Suspense>

      <OrbitalShells />

      <Suspense fallback={null}>
        <SatelliteCloud
          satellites={satellites}
          simTime={simTime}
          onSelect={handleSelect}
        />
      </Suspense>

      {selectedSat && showOrbitPath && (
        <OrbitalPath sat={selectedSat} simTime={simTime} />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={200}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        makeDefault
      />
    </Canvas>
  );
}
