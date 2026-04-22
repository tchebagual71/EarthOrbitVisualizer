"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Earth } from "./Earth";
import { OrbitalShells } from "./OrbitalShells";
import { SatelliteCloud } from "./SatelliteCloud";
import { SatelliteSelector } from "./SatelliteSelector";
import { OrbitalPath } from "./OrbitalPath";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import type { SatelliteRecord } from "@/types/satellite";

export function SceneCanvas() {
  const { simTime, playing, timeSpeed, setSimTime, selectedSat, setSelectedSat, showOrbitPath, enabledCategories } = useStore();
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  // Shared position buffers written by SatelliteCloud every frame
  const positionsRef = useRef(new Float32Array(0));
  const posValidRef  = useRef(new Uint8Array(0));

  // Touch-tap state
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  // Advance simulation clock
  useEffect(() => {
    if (!playing || timeSpeed === 0) return;
    const tick = (ts: number) => {
      if (lastTs.current !== null) {
        const realDelta = ts - lastTs.current;
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

  // Pointer down: record start position
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Pointer up: if movement < 8px treat as a tap → trigger proximity search
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 8) return;
    setTapPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="h-full w-full"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0, 25], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#000008", touchAction: "none" }}
      >
        <ambientLight intensity={0.1} />
        <directionalLight position={[50, 20, 30]} intensity={1.4} castShadow />

        <Stars radius={300} depth={60} count={6000} factor={5} saturation={0} fade />

        <Suspense fallback={null}>
          <Earth />
        </Suspense>

        <OrbitalShells />

        <Suspense fallback={null}>
          <SatelliteCloud
            satellites={satellites}
            simTime={simTime}
            positionsRef={positionsRef}
            posValidRef={posValidRef}
          />
        </Suspense>

        <SatelliteSelector
          satellites={satellites}
          positionsRef={positionsRef}
          posValidRef={posValidRef}
          tapPos={tapPos}
          onSelect={handleSelect}
          onClearTap={() => setTapPos(null)}
        />

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
    </div>
  );
}
