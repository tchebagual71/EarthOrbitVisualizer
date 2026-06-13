// Message protocol between SatelliteCloud and the propagation worker.
// Position/valid buffers ping-pong via transfer (zero copy): the main thread
// sends spare buffers with each propagate request; the worker fills them and
// transfers them back, where they become the live buffers.

export interface InitRequest {
  type: "init";
  tles: { line1: string; line2: string }[];
}

export interface PropagateRequest {
  type: "propagate";
  // Generation guard: bumped whenever the satellite list changes so late
  // responses for a previous list can be discarded.
  gen: number;
  timeMs: number;
  positions: ArrayBuffer; // Float32Array storage, length = count * 3
  valid: ArrayBuffer; // Uint8Array storage, length = count
}

export type WorkerRequest = InitRequest | PropagateRequest;

export interface PositionsResponse {
  type: "positions";
  gen: number;
  timeMs: number;
  positions: ArrayBuffer;
  valid: ArrayBuffer;
}

export type WorkerResponse = PositionsResponse;
