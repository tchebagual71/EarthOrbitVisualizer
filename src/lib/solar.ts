import * as satellite from "satellite.js";
import type { ScenePosition } from "./coordinates";

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function mod(x: number, m: number) { return ((x % m) + m) % m; }

// Low-precision solar position (accurate to ~1°) using truncated VSOP87
export function getSunDirectionScene(date: Date): ScenePosition {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T  = (JD - 2451545.0) / 36525;

  const L0   = mod(280.46646  + 36000.76983 * T, 360);
  const M    = mod(357.52911  + 35999.05029 * T - 0.0001537 * T * T, 360);
  const Mrad = toRad(M);
  const C    = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
             + (0.019993 - 0.000101 * T)                     * Math.sin(2 * Mrad)
             + 0.000289                                        * Math.sin(3 * Mrad);

  const sunLon = toRad(mod(L0 + C, 360));
  const eps    = toRad(23.439291 - 0.013004 * T);

  // Sun unit vector in ECI
  const eciX =  Math.cos(sunLon);
  const eciY =  Math.cos(eps) * Math.sin(sunLon);
  const eciZ =  Math.sin(eps) * Math.sin(sunLon);

  // ECI → ECEF: rotate by -GMST around Z  (matches satellite.js eciToEcf)
  const gmst  = satellite.gstime(date);
  const cosG  = Math.cos(gmst);
  const sinG  = Math.sin(gmst);
  const ecefX =  eciX * cosG + eciY * sinG;
  const ecefY = -eciX * sinG + eciY * cosG;
  const ecefZ =  eciZ;

  // ECEF → Scene: x=ECEF_x, y=ECEF_z (north pole up), z=-ECEF_y
  return { x: ecefX, y: ecefZ, z: -ecefY };
}
