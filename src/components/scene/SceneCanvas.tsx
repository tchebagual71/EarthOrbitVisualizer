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
import { SatelliteTrail } from "./SatelliteTrail";
import { SelectedSatelliteMarker } from "./SelectedSatelliteMarker";
import { LaunchSites } from "./LaunchSites";
import { SunLight } from "./SunLight";
import { useStore } from "@/hooks/useStore";
import { useAllTLEData } from "@/hooks/useTLEData";
import { propagateAt } from "@/lib/coordinates";
import { advanceSimMs, getSimMs, getSimTime } from "@/lib/simClock";
import type { SatelliteRecord } from "@/types/satellite";

// Advances the sim clock once per rendered frame, outside React state.
// Publishes a snapshot to the store only when the displayed second changes
// (throttled to ≥200 ms real time at high speeds) so UI clocks stay current
// without per-frame re-renders across the app.
function SimClockDriver() {
  const lastPubSec = useRef(Math.floor(getSimMs() / 1000));
  const lastPubReal = useRef(0);

  useFrame((_, delta) => {
    const { playing, timeSpeed, setSimTime } = useStore.getState();
    if (playing && timeSpeed !== 0) {
      // Cap delta so a backgrounded tab doesn't fast-forward on refocus
      advanceSimMs(Math.min(delta, 0.1) * 1000 * timeSpeed);
    }
    const sec = Math.floor(getSimMs() / 1000);
    const real = performance.now();
    if (sec !== lastPubSec.current && real - lastPubReal.current >= 200) {
      lastPubSec.current = sec;
      lastPubReal.current = real;
      setSimTime(getSimTime());
    }
  });

  return null;
}

// Smooth camera animator — handles both satellite and fixed-position jumps
function CameraJumper() {
  const jumpTarget = useStore((s) => s.jumpTarget);
  const setJumpTarget = useStore((s) => s.setJumpTarget);
  const jumpPosition = useStore((s) => s.jumpPosition);
  const setJumpPosition = useStore((s) => s.setJumpPosition);
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

  // Jump to satellite's position at the current *sim* time, so the camera
  // lands on the satellite even when the user has scrubbed the clock.
  useEffect(() => {
    if (!jumpTarget) return;
    try {
      const satrec = satellite.twoline2satrec(jumpTarget.line1, jumpTarget.line2);
      const pos = propagateAt(satrec, getSimTime());
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
  const selectedSat = useStore((s) => s.selectedSat);
  const setSelectedSat = useStore((s) => s.setSelectedSat);
  const showOrbitPath = useStore((s) => s.showOrbitPath);
  const showGroundTrack = useStore((s) => s.showGroundTrack);
  const showSatTrail = useStore((s) => s.showSatTrail);
  const enabledCategories = useStore((s) => s.enabledCategories);
  const showLaunchSites = useStore((s) => s.showLaunchSites);
  const showSearch = useStore((s) => s.showSearch);
  const setShowSearch = useStore((s) => s.setShowSearch);

  const positionsRef = useRef(new Float32Array(0));
  const posValidRef  = useRef(new Uint8Array(0));

  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

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
        <SimClockDriver />
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

        {/* Selection reticle always shows (independent of overlay toggles) */}
        {selectedSat && <SelectedSatelliteMarker sat={selectedSat} />}
        {selectedSat && showSatTrail && <SatelliteTrail sat={selectedSat} />}
        {selectedSat && showOrbitPath && <OrbitalPath sat={selectedSat} />}
        {selectedSat && showGroundTrack && <GroundTrack sat={selectedSat} />}

        <CameraJumper />

        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={200}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          enableDamping
          dampingFactor={0.1}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
