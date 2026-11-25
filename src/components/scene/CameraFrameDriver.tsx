"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { chaseCameraPosition, inertialFrameRotationY, propagateAt } from "@/lib/coordinates";
import { getSimMs, getSimTime } from "@/lib/simClock";
import { useStore } from "@/hooks/useStore";

interface ControlsLike {
  target: THREE.Vector3;
}

const ORIGIN = new THREE.Vector3(0, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// How far ahead (sim ms) to sample the orbit for the direction of travel
const AHEAD_MS = 10_000;
const TRANSITION_STEP = 0.03; // per frame → ~0.55 s at 60 fps

// Moves the camera with a reference frame other than the Earth-fixed scene:
//
//  • Follow — rides along with the selected satellite. The controls pivot on
//    the satellite and the camera's "up" is the local vertical, so the Earth
//    stays below and the user can still orbit/zoom around the satellite.
//  • Inertial view — co-rotates the camera with the stars, so the sky and
//    orbit planes hold still while the Earth turns underneath.
//
// Runs after OrbitControls' own update (which is at priority −1), and only
// ever nudges camera.position / controls.target, so user input keeps working.
export function CameraFrameDriver() {
  const selectedSat = useStore((s) => s.selectedSat);
  const followSat = useStore((s) => s.followSat);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const following = followSat && selectedSat !== null;
  const satrec = useMemo(() => {
    if (!following || !selectedSat) return null;
    try {
      return satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
    } catch {
      return null;
    }
  }, [following, selectedSat]);

  const prevPos = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  const transition = useRef(1); // 0 → 1 fly-in progress
  const startCam = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const releasing = useRef(false);
  const lastSkyAngle = useRef<number | null>(null);

  // (Re)start the fly-in whenever the followed satellite changes; hand the
  // pivot back to the Earth when following stops.
  useEffect(() => {
    if (!satrec) return;
    hasPrev.current = false;
    releasing.current = false;
    return () => {
      releasing.current = true;
    };
  }, [satrec]);

  const cur = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const dirA = useMemo(() => new THREE.Vector3(), []);
  const dirB = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!controls) return;
    const now = getSimTime();

    // Earth rotation since the previous frame, as seen from the scene
    const skyAngle = inertialFrameRotationY(now);
    const skyDelta = lastSkyAngle.current === null ? 0 : skyAngle - lastSkyAngle.current;
    lastSkyAngle.current = skyAngle;

    if (satrec) {
      const p = propagateAt(satrec, now);
      if (!p) return;
      cur.set(p.x, p.y, p.z);

      if (!hasPrev.current) {
        hasPrev.current = true;
        transition.current = 0;
        startCam.current.copy(camera.position);
        startTarget.current.copy(controls.target);
      }

      if (transition.current < 1) {
        // Fly in to a chase view: behind, above and a little to the side
        transition.current = Math.min(1, transition.current + TRANSITION_STEP);
        const t = 1 - Math.pow(1 - transition.current, 3);
        const ahead = propagateAt(satrec, new Date(getSimMs() + AHEAD_MS)) ?? p;
        const chase = chaseCameraPosition(p, ahead);
        camera.position.lerpVectors(startCam.current, tmp.set(chase.x, chase.y, chase.z), t);
        controls.target.lerpVectors(startTarget.current, cur, t);
        camera.up.lerp(dirA.copy(cur).normalize(), t).normalize();
      } else {
        // Carry the camera's offset around with the satellite, turning it by
        // the same angle the satellite moved through about the Earth's center.
        dirA.copy(prevPos.current).normalize();
        dirB.copy(cur).normalize();
        quat.setFromUnitVectors(dirA, dirB);
        tmp.copy(camera.position).sub(prevPos.current).applyQuaternion(quat);
        camera.position.copy(cur).add(tmp);
        controls.target.copy(cur);
        camera.up.copy(dirB);
      }
      prevPos.current.copy(cur);
      camera.lookAt(controls.target);
      return;
    }

    if (releasing.current) {
      // Ease the pivot and "up" back to the Earth-centered defaults
      controls.target.lerp(ORIGIN, 0.12);
      camera.up.lerp(Y_AXIS, 0.12).normalize();
      if (controls.target.lengthSq() < 1e-6) {
        controls.target.set(0, 0, 0);
        camera.up.set(0, 1, 0);
        releasing.current = false;
      }
      camera.lookAt(controls.target);
    }

    if (useStore.getState().inertialView && skyDelta !== 0) {
      camera.position.applyAxisAngle(Y_AXIS, skyDelta);
      camera.lookAt(controls.target);
    }
  });

  return null;
}
