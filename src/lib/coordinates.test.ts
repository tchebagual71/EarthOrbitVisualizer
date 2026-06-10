import { describe, it, expect } from "vitest";
import * as satellite from "satellite.js";
import { latLonToScene, eciToScene, propagateAt, getOrbitPath, getGroundTrack } from "./coordinates";
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
