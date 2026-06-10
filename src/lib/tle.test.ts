import { describe, it, expect } from "vitest";
import * as satellite from "satellite.js";
import {
  parseTLEText,
  parseTLEEpoch,
  getTLEAgeHours,
  classifyAltitude,
  classifyOrbit,
  orbitalPeriodMin,
  orbitalVelocityKms,
  tleToSatelliteRecord,
} from "./tle";

// Canonical ISS TLE (epoch 2008-09-20, ~350 km, i=51.64°)
const ISS_NAME = "ISS (ZARYA)";
const ISS_L1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927";
const ISS_L2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
const ISS_EPOCH = new Date(Date.UTC(2008, 0, 1) + (264.51782528 - 1) * 86400000);

// TLE checksum: digits sum at face value, '-' counts as 1, everything else 0
function withChecksum(line68: string): string {
  let sum = 0;
  for (const ch of line68) {
    if (ch >= "0" && ch <= "9") sum += Number(ch);
    else if (ch === "-") sum += 1;
  }
  return line68 + String(sum % 10);
}

// Splice a new epoch field (cols 19–32) into a line-1 string
function withEpoch(line1: string, epochField: string): string {
  return withChecksum(line1.slice(0, 18) + epochField + line1.slice(32, 68));
}

// Minimal satrec stub for classifyOrbit, which only reads mean motion + ecc
function fakeSatrec(periodMin: number, ecco: number): satellite.SatRec {
  return { no: (2 * Math.PI) / periodMin, ecco } as satellite.SatRec;
}

describe("parseTLEText", () => {
  const text = `${ISS_NAME}\n${ISS_L1}\n${ISS_L2}\n`;

  it("parses a single 3-line record", () => {
    const records = parseTLEText(text);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ name: ISS_NAME, line1: ISS_L1, line2: ISS_L2 });
  });

  it("parses multiple records and tolerates blank lines and CRLF", () => {
    const records = parseTLEText(`${text}\r\n\r\n${text}`);
    expect(records).toHaveLength(2);
    expect(records[1].name).toBe(ISS_NAME);
  });

  it("returns empty for malformed input", () => {
    expect(parseTLEText("")).toEqual([]);
    expect(parseTLEText("not a tle\nat all\nreally")).toEqual([]);
  });
});

describe("parseTLEEpoch", () => {
  it("decodes the ISS reference epoch (2008 day 264.518…)", () => {
    const epoch = parseTLEEpoch(ISS_L1);
    expect(epoch.getTime()).toBe(ISS_EPOCH.getTime());
    expect(epoch.getUTCFullYear()).toBe(2008);
    expect(epoch.getUTCMonth()).toBe(8); // September
    expect(epoch.getUTCDate()).toBe(20);
  });

  it("applies the 1957/2057 century pivot", () => {
    expect(parseTLEEpoch(withEpoch(ISS_L1, "56001.00000000")).getUTCFullYear()).toBe(2056);
    expect(parseTLEEpoch(withEpoch(ISS_L1, "57001.00000000")).getUTCFullYear()).toBe(1957);
  });
});

describe("getTLEAgeHours", () => {
  it("returns hours since epoch", () => {
    const oneDayLater = new Date(ISS_EPOCH.getTime() + 86400000);
    expect(getTLEAgeHours(ISS_L1, oneDayLater)).toBeCloseTo(24, 5);
  });
});

describe("classifyAltitude", () => {
  it("classifies the standard regimes", () => {
    expect(classifyAltitude(408)).toBe("LEO");
    expect(classifyAltitude(1999)).toBe("LEO");
    expect(classifyAltitude(2000)).toBe("MEO");
    expect(classifyAltitude(20200)).toBe("MEO");
  });

  it("classifies the full GEO tolerance band as GEO (regression: was MEO below 35,786)", () => {
    expect(classifyAltitude(35500)).toBe("GEO");
    expect(classifyAltitude(35786)).toBe("GEO");
    expect(classifyAltitude(36200)).toBe("GEO");
  });

  it("falls through to HEO above the GEO band", () => {
    expect(classifyAltitude(36300)).toBe("HEO");
  });
});

describe("classifyOrbit", () => {
  it("classifies ISS as LEO from its real satrec", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    expect(classifyOrbit(satrec)).toBe("LEO");
  });

  it("classifies a 12-hour, near-circular orbit as MEO (GPS)", () => {
    expect(classifyOrbit(fakeSatrec(717.97, 0.01))).toBe("MEO");
  });

  it("classifies a sidereal-day, near-circular orbit as GEO", () => {
    expect(classifyOrbit(fakeSatrec(1436.07, 0.0002))).toBe("GEO");
  });

  it("classifies eccentric orbits as HEO regardless of mean altitude (Molniya)", () => {
    // Semi-synchronous like GPS, but e=0.74 — an altitude snapshot near
    // perigee (~500 km) would have called this LEO
    expect(classifyOrbit(fakeSatrec(717.7, 0.74))).toBe("HEO");
  });
});

describe("orbital quantities", () => {
  it("computes ~91.5 min period for ISS", () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const period = orbitalPeriodMin(satrec.no);
    expect(period).toBeGreaterThan(91);
    expect(period).toBeLessThan(92.5);
  });

  it("computes ~7.7 km/s circular velocity at ISS altitude", () => {
    expect(orbitalVelocityKms(408)).toBeCloseTo(7.67, 1);
  });
});

describe("tleToSatelliteRecord", () => {
  const tle = { name: ISS_NAME, line1: ISS_L1, line2: ISS_L2 };

  it("propagates at the given date and fills in derived fields", () => {
    const rec = tleToSatelliteRecord(tle, "stations", ISS_EPOCH);
    expect(rec).not.toBeNull();
    expect(rec!.noradId).toBe(25544);
    expect(rec!.category).toBe("stations");
    expect(rec!.inclination).toBeCloseTo(51.64, 1);
    expect(rec!.altitude).toBeGreaterThan(300);
    expect(rec!.altitude).toBeLessThan(450);
  });

  it("returns null for garbage TLE lines", () => {
    expect(
      tleToSatelliteRecord({ name: "junk", line1: "1 junk", line2: "2 junk" }, "stations", ISS_EPOCH)
    ).toBeNull();
  });
});
