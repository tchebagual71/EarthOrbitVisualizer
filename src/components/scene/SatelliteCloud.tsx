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

    // Draw the latest completed batch. Instances are axis-aligned spheres, so
    // write scale + translation straight into the matrix buffer (the
    // off-diagonal terms stay at their identity zeros) instead of composing
    // a full matrix per satellite. Scale 0 hides instances with no data yet.
    const pos = positionsRef.current;
    const valid = posValidRef.current;
    const m = mesh.instanceMatrix.array;
    const count = Math.min(satellites.length, Math.floor(m.length / 16));
    const n = Math.min(count, valid.length, Math.floor(pos.length / 3));
    for (let i = 0; i < count; i++) {
      const o = i * 16;
      const s = i < n && valid[i] ? 1 : 0;
      m[o] = s;
      m[o + 5] = s;
      m[o + 10] = s;
      m[o + 15] = 1;
      if (s) {
        m[o + 12] = pos[i * 3];
        m[o + 13] = pos[i * 3 + 1];
        m[o + 14] = pos[i * 3 + 2];
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!satellites.length) return null;

  return (
    // Instances move every frame, so the mesh's cached bounding sphere would
    // be stale — skip frustum culling rather than recompute it.
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, satellites.length]}
      frustumCulled={false}
    >
      {/* 20 triangles per dot: the catalogue runs to tens of thousands */}
      <icosahedronGeometry args={[SAT_MARKER_SIZE, 0]} />
      <meshBasicMaterial vertexColors />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
