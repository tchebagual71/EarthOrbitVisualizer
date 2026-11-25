import { describe, it, expect } from "vitest";
import * as satellite from "satellite.js";
import {
  latLonToScene,
  eciToScene,
  propagateAt,
  propagateBatch,
  getOrbitPath,
  getGroundTrack,
  orbitFrameRotationY,
  isOccludedByEarth,
  getLiveState,
  chaseCameraPosition,
} from "./coordinates";
import { EARTH_RADIUS_SCENE } from "./constants";

const ISS_L1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927";
const ISS_L2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
const ISS_EPOCH = new Date(Date.UTC(2008, 0, 1) + (264.51782528 - 1) * 86400000);

const len = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe("latLonToScene", () => {
  it("puts the north pole on +Y", () => {
    const p = latLonToScene(90, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(EARTH_RADIUS_SCENE, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it("puts (0°, 0°) on +X and 90°E on −Z", () => {
    const greenwich = latLonToScene(0, 0);
    expect(greenwich.x).toBeCloseTo(EARTH_RADIUS_SCENE, 6);
    expect(greenwich.y).toBeCloseTo(0, 6);
    expect(greenwich.z).toBeCloseTo(0, 6);

    const east = latLonToScene(0, 90);
    expect(east.x).toBeCloseTo(0, 6);
    expect(east.z).toBeCloseTo(-EARTH_RADIUS_SCENE, 6);
  });

  it("always lands on the sphere surface", () => {
    expect(len(latLonToScene(28.56, -80.58))).toBeCloseTo(EARTH_RADIUS_SCENE, 6);
    expect(len(latLonToScene(-45.7, 168.3))).toBeCloseTo(EARTH_RADIUS_SCENE, 6);
  });
});

describe("eciToScene", () => {
  it("maps ECI axes to the Y-up scene at gmst=0", () => {
    // At gmst=0, ECEF == ECI; scene swaps Z up and negates Y
    const p = eciToScene({ x: 7000, y: 0, z: 0 }, 0);
    expect(p).toEqual({ x: 7, y: 0, z: -0 });

    const pole = eciToScene({ x: 0, y: 0, z: 7000 }, 0);
    expect(pole.y).toBeCloseTo(7, 6);
  });

  it("rotates with Earth via gmst", () => {
    const p = eciToScene({ x: 7000, y: 0, z: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(7, 6);
  });

  it("preserves vector magnitude", () => {
    const p = eciToScene({ x: 4000, y: -3000, z: 5000 }, 1.234);
    expect(len(p)).toBeCloseTo(Math.hypot(4, 3, 5), 6);
  });
});

describe("propagateAt", () => {
  it("places ISS at LEO radius at its TLE epoch", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const pos = propagateAt(satrec, ISS_EPOCH);
    expect(pos).not.toBeNull();
    const radius = len(pos!);
    // ~6,720 km geocentric → ~6.72 scene units
    expect(radius).toBeGreaterThan(6.6);
    expect(radius).toBeLessThan(6.9);
  });
});

describe("propagateBatch", () => {
  it("matches propagateAt for a valid satrec and flags null satrecs invalid", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const positions = new Float32Array(3 * 3);
    const valid = new Uint8Array(3);

    propagateBatch([satrec, null, satrec], ISS_EPOCH, positions, valid);

    expect(Array.from(valid)).toEqual([1, 0, 1]);
    const single = propagateAt(satrec, ISS_EPOCH)!;
    expect(positions[0]).toBeCloseTo(single.x, 4);
    expect(positions[1]).toBeCloseTo(single.y, 4);
    expect(positions[2]).toBeCloseTo(single.z, 4);
    expect(positions[6]).toBeCloseTo(single.x, 4);
  });

  it("only writes within the smallest of list/buffer lengths", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const positions = new Float32Array(3); // room for 1 satellite
    const valid = new Uint8Array(1);
    // Longer satrec list than buffers — must not throw or write out of bounds
    propagateBatch([satrec, satrec, satrec], ISS_EPOCH, positions, valid);
    expect(valid[0]).toBe(1);
  });

  it("marks NaN propagation results invalid", () => {
    const junk = satellite.twoline2satrec("1 junk", "2 junk");
    const positions = new Float32Array(3);
    const valid = new Uint8Array([1]); // pre-set to ensure it's cleared
    propagateBatch([junk], ISS_EPOCH, positions, valid);
    expect(valid[0]).toBe(0);
  });
});

describe("getOrbitPath", () => {
  it("returns steps+1 finite points at orbital radius", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const path = getOrbitPath(satrec, ISS_EPOCH, 90);
    expect(path).toHaveLength(91);
    for (const p of path) {
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
      const r = len(p);
      expect(r).toBeGreaterThan(6.6);
      expect(r).toBeLessThan(6.9);
    }
  });
});

describe("getGroundTrack", () => {
  it("projects every point just above the Earth surface", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const track = getGroundTrack(satrec, ISS_EPOCH, 60);
    expect(track.length).toBeGreaterThan(2);
    for (const p of track) {
      expect(len(p)).toBeCloseTo(EARTH_RADIUS_SCENE * 1.002, 4);
    }
  });
});

describe("getOrbitPath (inertial frame)", () => {
  const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);

  it("closes on itself after one revolution instead of spiralling", () => {
    const path = getOrbitPath(satrec, ISS_EPOCH, 180);
    const gap = len({
      x: path[0].x - path[path.length - 1].x,
      y: path[0].y - path[path.length - 1].y,
      z: path[0].z - path[path.length - 1].z,
    });
    // An Earth-fixed path would miss by ~2,500 km (23° of rotation at LEO)
    expect(gap).toBeLessThan(0.1);
  });

  it("starts at the satellite's current position", () => {
    const path = getOrbitPath(satrec, ISS_EPOCH, 90);
    const now = propagateAt(satrec, ISS_EPOCH)!;
    expect(path[0].x).toBeCloseTo(now.x, 6);
    expect(path[0].y).toBeCloseTo(now.y, 6);
    expect(path[0].z).toBeCloseTo(now.z, 6);
  });
});

describe("orbitFrameRotationY", () => {
  it("carries an inertial point from one Earth-fixed frame to a later one", () => {
    const eci = { x: 7000, y: 1200, z: -300 };
    const t0 = ISS_EPOCH;
    const t1 = new Date(t0.getTime() + 47 * 60_000);
    const p0 = eciToScene(eci, satellite.gstime(t0));
    const expected = eciToScene(eci, satellite.gstime(t1));
    // Same convention as THREE's rotation about +Y
    const a = orbitFrameRotationY(t0, t1);
    const x = p0.x * Math.cos(a) + p0.z * Math.sin(a);
    const z = -p0.x * Math.sin(a) + p0.z * Math.cos(a);
    expect(x).toBeCloseTo(expected.x, 6);
    expect(p0.y).toBeCloseTo(expected.y, 6);
    expect(z).toBeCloseTo(expected.z, 6);
  });
});

describe("isOccludedByEarth", () => {
  const eye = { x: 0, y: 0, z: 25 };

  it("hides a satellite directly behind the globe", () => {
    expect(isOccludedByEarth(eye, { x: 0, y: 0, z: -7 })).toBe(true);
  });

  it("keeps near-side and limb satellites visible", () => {
    expect(isOccludedByEarth(eye, { x: 0, y: 0, z: 7 })).toBe(false);
    expect(isOccludedByEarth(eye, { x: 7, y: 0, z: 0 })).toBe(false);
    // Far side but high enough to clear the limb (GEO distance)
    expect(isOccludedByEarth(eye, { x: 30, y: 0, z: -29 })).toBe(false);
  });

  it("hides a far-side satellite just below the limb", () => {
    expect(isOccludedByEarth(eye, { x: 3, y: 0, z: -6.5 })).toBe(true);
  });
});

describe("getLiveState", () => {
  const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);

  it("reports ISS-like altitude, speed and a sub-point within its inclination", () => {
    const s = getLiveState(satrec, ISS_EPOCH)!;
    expect(s.altitudeKm).toBeGreaterThan(330);
    expect(s.altitudeKm).toBeLessThan(370);
    expect(s.speedKms).toBeGreaterThan(7.5);
    expect(s.speedKms).toBeLessThan(7.9);
    expect(Math.abs(s.latDeg)).toBeLessThanOrEqual(51.7);
    expect(Math.abs(s.lonDeg)).toBeLessThanOrEqual(180);
  });

  it("changes as time advances", () => {
    const a = getLiveState(satrec, ISS_EPOCH)!;
    const b = getLiveState(satrec, new Date(ISS_EPOCH.getTime() + 10 * 60_000))!;
    expect(Math.abs(a.lonDeg - b.lonDeg)).toBeGreaterThan(1);
  });

  it("returns null when propagation fails", () => {
    expect(getLiveState(satellite.twoline2satrec("garbage", "garbage"), ISS_EPOCH)).toBeNull();
  });
});

describe("chaseCameraPosition", () => {
  const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
  const pos = propagateAt(satrec, ISS_EPOCH)!;
  const ahead = propagateAt(satrec, new Date(ISS_EPOCH.getTime() + 10_000))!;
  const cam = chaseCameraPosition(pos, ahead);
  const sub = (a: typeof pos, b: typeof pos) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const dot = (a: typeof pos, b: typeof pos) => a.x * b.x + a.y * b.y + a.z * b.z;

  it("sits above and behind the satellite with a clear line of sight", () => {
    const offset = sub(cam, pos);
    expect(len(cam)).toBeGreaterThan(len(pos)); // above
    expect(dot(offset, sub(ahead, pos))).toBeLessThan(0); // behind
    expect(len(offset)).toBeGreaterThan(1);
    expect(isOccludedByEarth(cam, pos)).toBe(false);
  });

  it("is out of the orbital plane, so the orbit isn't seen edge-on", () => {
    const f = sub(ahead, pos);
    const normal = {
      x: pos.y * f.z - pos.z * f.y,
      y: pos.z * f.x - pos.x * f.z,
      z: pos.x * f.y - pos.y * f.x,
    };
    expect(Math.abs(dot(sub(cam, pos), normal)) / len(normal)).toBeGreaterThan(0.5);
  });

  it("still returns a finite stand-off for a satellite that isn't moving", () => {
    const geo = { x: 42.164, y: 0, z: 0 };
    const c = chaseCameraPosition(geo, geo);
    expect(Number.isFinite(c.x + c.y + c.z)).toBe(true);
    expect(len(sub(c, geo))).toBeGreaterThan(5);
  });
});
