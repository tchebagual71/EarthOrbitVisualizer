import { describe, it, expect } from "vitest";
import { getMoonEci } from "./moon";

const len = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe("getMoonEci", () => {
  it("matches JPL Horizons to low-precision tolerance", () => {
    // Horizons geocentric ICRF vector for 2026-Nov-26 00:00 TDB
    const ref = { x: 4.501466093581405e4, y: 3.152129730137895e5, z: 1.665959670373759e5 };
    const p = getMoonEci(new Date(Date.UTC(2026, 10, 26) - 69_184));
    const cos = (p.x * ref.x + p.y * ref.y + p.z * ref.z) / (len(p) * len(ref));
    expect((Math.acos(cos) * 180) / Math.PI).toBeLessThan(0.6);
    expect(Math.abs(len(p) - len(ref))).toBeLessThan(2500);
  });

  it("stays within the Moon's perigee–apogee range and completes an orbit a month", () => {
    const t0 = Date.UTC(2026, 0, 1);
    let turned = 0;
    let prev = getMoonEci(new Date(t0));
    for (let d = 1; d <= 27; d++) {
      const p = getMoonEci(new Date(t0 + d * 86400000));
      expect(len(p)).toBeGreaterThan(356000);
      expect(len(p)).toBeLessThan(407000);
      turned += Math.acos((p.x * prev.x + p.y * prev.y + p.z * prev.z) / (len(p) * len(prev)));
      prev = p;
    }
    expect((turned * 180) / Math.PI).toBeGreaterThan(340);
    expect((turned * 180) / Math.PI).toBeLessThan(370);
  });
});
