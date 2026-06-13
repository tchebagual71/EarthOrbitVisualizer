"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { propagateBatch } from "@/lib/coordinates";
import { getSimMs, getSimTime } from "@/lib/simClock";
import type { SatelliteRecord } from "@/types/satellite";
import { SAT_MARKER_SIZE } from "@/lib/constants";
import { CATEGORY_MAP } from "@/lib/categories";
import type { WorkerResponse } from "@/workers/messages";

interface Props {
  satellites: SatelliteRecord[];
  // Shared buffers, also read by SatelliteSelector:
  // [x0,y0,z0, x1,y1,z1, ...]; index i is valid only when posValid[i] === 1
  positionsRef: React.MutableRefObject<Float32Array>;
  posValidRef: React.MutableRefObject<Uint8Array>;
}

const makeBuffers = (count: number) => ({
  positions: new ArrayBuffer(count * 3 * 4),
  valid: new ArrayBuffer(count),
});

// SGP4 runs in a Web Worker; each frame the latest completed batch is drawn
// and (if the worker is idle) the next batch is requested at the current sim
// time. Positions therefore lag the clock by ≤1 frame, which is invisible at
// normal speeds. If the worker can't start, propagation falls back to the
// main thread.
export function SatelliteCloud({ satellites, positionsRef, posValidRef }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const workerRef = useRef<Worker | null>(null);
  const workerFailedRef = useRef(false);
  const pendingRef = useRef(false);
  const genRef = useRef(0);
  const countRef = useRef(0);
  const spareRef = useRef<{ positions: ArrayBuffer; valid: ArrayBuffer } | null>(null);
  // Built lazily only if the worker fails
  const fallbackSatrecsRef = useRef<(satellite.SatRec | null)[] | null>(null);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      workerFailedRef.current = true;
      return;
    }
    const worker = new Worker(new URL("../../workers/propagator.worker.ts", import.meta.url));
    worker.onerror = (err) => {
      console.error("Propagation worker failed — falling back to main thread", err);
      workerFailedRef.current = true;
      pendingRef.current = false;
    };
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type !== "positions") return;
      pendingRef.current = false;
      if (msg.gen !== genRef.current) {
        // Late response for a previous satellite list — drop it and re-arm
        spareRef.current = makeBuffers(countRef.current);
        return;
      }
      // Swap: the worker's result becomes live; the old live buffers become
      // the transfer payload for the next request.
      const oldPositions = positionsRef.current.buffer as ArrayBuffer;
      const oldValid = posValidRef.current.buffer as ArrayBuffer;
      positionsRef.current = new Float32Array(msg.positions);
      posValidRef.current = new Uint8Array(msg.valid);
      spareRef.current = { positions: oldPositions, valid: oldValid };
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [positionsRef, posValidRef]);

  // (Re)initialize worker + buffers whenever the satellite list changes
  useEffect(() => {
    genRef.current += 1;
    countRef.current = satellites.length;
    positionsRef.current = new Float32Array(satellites.length * 3);
    posValidRef.current = new Uint8Array(satellites.length);
    spareRef.current = makeBuffers(satellites.length);
    pendingRef.current = false;
    fallbackSatrecsRef.current = null;
    workerRef.current?.postMessage({
      type: "init",
      tles: satellites.map((s) => ({ line1: s.line1, line2: s.line2 })),
    });
  }, [satellites, positionsRef, posValidRef]);

  const colors = useMemo(() => {
    const arr = new Float32Array(satellites.length * 3);
    satellites.forEach((s, i) => {
      const hex = CATEGORY_MAP[s.category]?.color ?? "#ffffff";
      const c = new THREE.Color(hex);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [satellites]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !satellites.length) return;

    if (workerFailedRef.current) {
      // Main-thread fallback: propagate synchronously every frame
      if (!fallbackSatrecsRef.current) {
        fallbackSatrecsRef.current = satellites.map((s) => {
          try {
            return satellite.twoline2satrec(s.line1, s.line2);
          } catch {
            return null;
          }
        });
        if (posValidRef.current.length !== satellites.length) {
          positionsRef.current = new Float32Array(satellites.length * 3);
          posValidRef.current = new Uint8Array(satellites.length);
        }
      }
      propagateBatch(fallbackSatrecsRef.current, getSimTime(), positionsRef.current, posValidRef.current);
    } else if (workerRef.current && !pendingRef.current && spareRef.current) {
      const { positions, valid } = spareRef.current;
      spareRef.current = null;
      pendingRef.current = true;
      workerRef.current.postMessage(
        { type: "propagate", gen: genRef.current, timeMs: getSimMs(), positions, valid },
        [positions, valid]
      );
    }

    // Draw the latest completed batch
    const pos = positionsRef.current;
    const valid = posValidRef.current;
    const n = Math.min(satellites.length, valid.length, Math.floor(pos.length / 3));
    for (let i = 0; i < n; i++) {
      if (valid[i]) {
        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.scale.setScalar(1);
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    // Hide instances we have no data for yet (first batch still in flight)
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = n; i < satellites.length; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!satellites.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, satellites.length]}>
      <sphereGeometry args={[SAT_MARKER_SIZE, 6, 6]} />
      <meshBasicMaterial vertexColors />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
