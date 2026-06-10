import { describe, it, expect } from "vitest";
import { getSunDirectionScene } from "./solar";

const len = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe("getSunDirectionScene", () => {
  it("returns a unit vector", () => {
    expect(len(getSunDirectionScene(new Date()))).toBeCloseTo(1, 3);
  });

  it("tilts north (+Y) at June solstice and south at December solstice", () => {
    const june = getSunDirectionScene(new Date(Date.UTC(2025, 5, 21, 12)));
    const december = getSunDirectionScene(new Date(Date.UTC(2025, 11, 21, 12)));
    // sin(23.44°) ≈ 0.398
    expect(june.y).toBeGreaterThan(0.35);
    expect(june.y).toBeLessThan(0.45);
    expect(december.y).toBeLessThan(-0.35);
    expect(december.y).toBeGreaterThan(-0.45);
  });

  it("crosses the equator at the March equinox", () => {
    const equinox = getSunDirectionScene(new Date(Date.UTC(2025, 2, 20, 12)));
    expect(Math.abs(equinox.y)).toBeLessThan(0.05);
  });

  it("points near the Greenwich meridian (+X) at 12:00 UTC", () => {
    // Equation of time keeps the true sun within a few degrees of 0° lon at noon UTC
    const noon = getSunDirectionScene(new Date(Date.UTC(2025, 2, 20, 12)));
    expect(noon.x).toBeGreaterThan(0.95);
  });
});
