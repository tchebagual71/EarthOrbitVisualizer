// Simulation clock held outside React state so per-frame consumers
// (useFrame loops) can read it without triggering re-renders. The store's
// simTime is a low-frequency published snapshot of this clock for UI display;
// scrubbing writes through the store's setSimTime, which syncs this module.
let simMs = Date.now();

export function getSimMs(): number {
  return simMs;
}

export function getSimTime(): Date {
  return new Date(simMs);
}

export function setSimMs(ms: number): void {
  simMs = ms;
}

export function advanceSimMs(deltaMs: number): void {
  simMs += deltaMs;
}
