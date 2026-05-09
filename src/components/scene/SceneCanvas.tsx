"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { Earth } from "./Earth";
import { OrbitalShells } from "./OrbitalShells";
import { SatelliteCloud } from "./SatelliteCloud";
import { SatelliteSelector } from "./SatelliteSelector";
import { OrbitalPath } from "./OrbitalPath";
import { GroundTrack } from "./GroundTrack";
import { LaunchSites } from "./LaunchSites";
import { SunLight } from "./SunLight";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import { propagateAt } from "@/lib/coordinates";
import type { SatelliteRecord } from "@/types/satellite";

// Smooth camera animator — handles both satellite and fixed-position jumps
function CameraJumper() {
  const { jumpTarget, setJumpTarget, jumpPosition, setJumpPosition } = useStore();
  const { camera } = useThree();
  const targetVec   = useRef(new THREE.Vector3());
  const startPos    = useRef(new THREE.Vector3());
  const endPos      = useRef(new THREE.Vector3());
  const jumping     = useRef(false);
  const progress    = useRef(0);

  const startJump = useCallback((scenePos: { x: number; y: number; z: number }, orbitDist: number) => {
    const dir = new THREE.Vector3(scenePos.x, scenePos.y, scenePos.z).normalize();
    startPos.current.copy(camera.position);
    endPos.current.copy(dir.multiplyScalar(orbitDist));
    targetVec.current.set(scenePos.x, scenePos.y, scenePos.z);
    progress.current = 0;
    jumping.current = true;
  }, [camera]);

  // Jump to satellite's current position
  useEffect(() => {
    if (!jumpTarget) return;
    try {
      const satrec = satellite.twoline2satrec(jumpTarget.line1, jumpTarget.line2);
      const pos = propagateAt(satrec, new Date());
      if (pos) startJump(pos, Math.max(camera.position.length() * 0.5, 20));
    } catch { /* ignore */ }
    setJumpTarget(null);
  }, [jumpTarget, camera, setJumpTarget, startJump]);

  // Jump to a fixed scene position (e.g. launch site on Earth surface)
  useEffect(() => {
    if (!jumpPosition) return;
    startJump(jumpPosition, 9); // zoom in close to Earth surface
    setJumpPosition(null);
  }, [jumpPosition, setJumpPosition, startJump]);

  useFrame(() => {
    if (!jumping.current) return;
    progress.current = Math.min(progress.current + 0.035, 1);
    const t = 1 - Math.pow(1 - progress.current, 3); // cubic ease-out
    camera.position.lerpVectors(startPos.current, endPos.current, t);
    camera.lookAt(targetVec.current);
    if (progress.current >= 1) jumping.current = false;
  });

  return null;
}

export function SceneCanvas() {
  const {
    simTime, playing, timeSpeed, setSimTime,
    selectedSat, setSelectedSat,
    showOrbitPath, showGroundTrack,
    enabledCategories, showLaunchSites,
    showSearch, setShowSearch,
  } = useStore();
  const rafRef  = useRef<number | null>(null);
  const lastTs  = useRef<number | null>(null);

  const positionsRef = useRef(new Float32Array(0));
  const posValidRef  = useRef(new Uint8Array(0));

  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  // Advance simulation clock
  useEffect(() => {
    if (!playing || timeSpeed === 0) return;
    const tick = (ts: number) => {
      if (lastTs.current !== null) {
        setSimTime(new Date(simTime.getTime() + (ts - lastTs.current) * timeSpeed));
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

  // '/' key opens search from anywhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !showSearch && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSearch, setShowSearch]);

  const { satellites } = useAllTLEData(enabledCategories);

  const handleSelect = useCallback(
    (sat: SatelliteRecord) => setSelectedSat(sat),
    [setSelectedSat]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
    setTapPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="h-full w-full" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      <Canvas
        camera={{ position: [0, 0, 25], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#000008", touchAction: "none" }}
      >
        <ambientLight intensity={0.1} />
        <SunLight />
        <Stars radius={300} depth={60} count={6000} factor={5} saturation={0} fade />

        <Suspense fallback={null}>
          <Earth />
        </Suspense>

        <OrbitalShells />

        {showLaunchSites && (
          <Suspense fallback={null}>
            <LaunchSites />
          </Suspense>
        )}

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
        {selectedSat && showGroundTrack && (
          <GroundTrack sat={selectedSat} simTime={simTime} />
        )}

        <CameraJumper />

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
