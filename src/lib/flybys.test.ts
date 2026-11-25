import { describe, it, expect } from "vitest";
import {
  AU_KM,
  estimateDiameterM,
  flybyPositionAt,
  formatDiameter,
  formatLunarDistances,
  jdTdbToUnixMs,
  parseCloseApproaches,
  parseHorizonsVectors,
} from "./flybys";

// Trimmed real responses (JPL SBDB close-approach API / Horizons, 2026-11-25)
const CAD = {
  signature: { version: "1.5", source: "NASA/JPL SBDB Close Approach Data API" },
  count: 2,
  fields: ["des", "orbit_id", "jd", "cd", "dist", "dist_min", "dist_max", "v_rel", "v_inf", "t_sigma_f", "h", "diameter", "diameter_sigma", "fullname"],
  data: [
    ["2026 VQ19", "8", "2461370.927154660", "2026-Nov-26 10:15", "0.0101245921477465", "0.0100848436381573", "0.010164337104877", "6.77869500077727", "6.7397602186926", "< 00:01", "25.294", null, null, "       (2026 VQ19)"],
    ["433", "659", "2461400.5", "2026-Dec-26 00:00", "0.04", "0.04", "0.04", "5.0", "5.0", "< 00:01", "10.38", "16.84", "0.06", "   433 Eros (A898 PA)"],
  ],
};

const HORIZONS = `*******
            JDTDB,            Calendar Date (TDB),                      X,                      Y,                      Z,
**********
$$SOE
2461370.500000000, A.D. 2026-Nov-26 00:00:00.0000,  1.434024250240460E+06, -5.004191526746750E+04,  5.452562040277719E+05,
2461371.000000000, A.D. 2026-Nov-26 12:00:00.0000,  1.354998833845586E+06, -3.278599974172860E+05,  5.935986976869628E+05,
2461371.500000000, A.D. 2026-Nov-27 00:00:00.0000,  1.275635431236252E+06, -6.055420072292387E+05,  6.417812814706936E+05,
$$EOE
*******`;

describe("parseCloseApproaches", () => {
  const flybys = parseCloseApproaches(CAD);

  it("reads designation, time, distance and speed", () => {
    expect(flybys).toHaveLength(2);
    const f = flybys[0];
    expect(f.des).toBe("2026 VQ19");
    expect(f.name).toBe("2026 VQ19");
    expect(new Date(f.caTimeMs).toISOString().slice(0, 16)).toBe("2026-11-26T10:13");
    expect(f.distKm).toBeCloseTo(0.0101245921477465 * AU_KM, 0);
    expect(f.distMinKm).toBeLessThan(f.distKm);
    expect(f.vRelKms).toBeCloseTo(6.779, 3);
  });

  it("estimates size from brightness unless a measured diameter exists", () => {
    expect(flybys[0].diameterM).toBeGreaterThan(20);
    expect(flybys[0].diameterM).toBeLessThan(50);
    expect(flybys[1].diameterM).toBeCloseTo(16840, 0);
    expect(flybys[1].name).toBe("433 Eros (A898 PA)");
  });

  it("returns nothing for malformed payloads", () => {
    expect(parseCloseApproaches(null)).toEqual([]);
    expect(parseCloseApproaches({ count: 0 })).toEqual([]);
    expect(parseCloseApproaches({ fields: ["x"], data: [["1"]] })).toEqual([]);
  });
});

describe("parseHorizonsVectors / flybyPositionAt", () => {
  const path = parseHorizonsVectors(HORIZONS)!;

  it("extracts evenly spaced samples", () => {
    expect(path.xyz).toHaveLength(9);
    expect(path.stepMs).toBeCloseTo(12 * 3600_000, 0);
    expect(path.t0Ms).toBe(jdTdbToUnixMs(2461370.5));
  });

  it("interpolates between samples and ends at the window edges", () => {
    const mid = flybyPositionAt(path, path.t0Ms + path.stepMs / 2)!;
    expect(mid.x).toBeCloseTo((1.43402425024046e6 + 1.354998833845586e6) / 2, 3);
    expect(flybyPositionAt(path, path.t0Ms)!.y).toBeCloseTo(-5.00419152674675e4, 3);
    expect(flybyPositionAt(path, path.t0Ms + 2 * path.stepMs)!.z).toBeCloseTo(6.417812814706936e5, 3);
    expect(flybyPositionAt(path, path.t0Ms - 1)).toBeNull();
    expect(flybyPositionAt(path, path.t0Ms + 2 * path.stepMs + 1)).toBeNull();
  });

  it("returns null when there is no ephemeris block", () => {
    expect(parseHorizonsVectors("No matches found.")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats lunar distances and sizes", () => {
    expect(formatLunarDistances(384_400 * 3.94)).toBe("3.9 LD");
    expect(formatLunarDistances(384_400 * 16.2)).toBe("16 LD");
    expect(formatDiameter(null)).toBe("size unknown");
    expect(formatDiameter(27.4)).toBe("~27 m");
    expect(formatDiameter(16840)).toBe("~16.8 km");
    expect(estimateDiameterM(22)).toBeGreaterThan(100);
  });
});
