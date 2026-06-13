// SGP4 batch propagation off the main thread. Receives the TLE list once
// per satellite-set change, then answers propagate requests by filling the
// transferred buffers and transferring them straight back.
import * as satellite from "satellite.js";
import { propagateBatch } from "@/lib/coordinates";
import type { WorkerRequest, PositionsResponse } from "./messages";

let satrecs: (satellite.SatRec | null)[] = [];

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "init") {
    satrecs = msg.tles.map((t) => {
      try {
        return satellite.twoline2satrec(t.line1, t.line2);
      } catch {
        return null;
      }
    });
    return;
  }

  const positions = new Float32Array(msg.positions);
  const valid = new Uint8Array(msg.valid);
  propagateBatch(satrecs, new Date(msg.timeMs), positions, valid);

  const response: PositionsResponse = {
    type: "positions",
    gen: msg.gen,
    timeMs: msg.timeMs,
    positions: msg.positions,
    valid: msg.valid,
  };
  ctx.postMessage(response, [msg.positions, msg.valid]);
};
