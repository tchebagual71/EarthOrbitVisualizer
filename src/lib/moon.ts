// Low-precision geocentric position of the Moon (Astronomical Almanac series:
// ~0.3° in direction, ~0.2 Earth radii in distance) — plenty for drawing the
// Moon and its orbit as a scale reference.

export interface EciKm {
  x: number;
  y: number;
  z: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;
const EARTH_EQUATORIAL_RADIUS_KM = 6378.14;

// Moon position in the Earth-centered equatorial inertial frame, km.
export function getMoonEci(date: Date): EciKm {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const s = (a: number, b: number): number => Math.sin(rad(a + b * T));
  const c = (a: number, b: number): number => Math.cos(rad(a + b * T));

  const lon = rad(
    218.32 + 481267.881 * T
      + 6.29 * s(135.0, 477198.87) - 1.27 * s(259.3, -413335.36)
      + 0.66 * s(235.7, 890534.22) + 0.21 * s(269.9, 954397.74)
      - 0.19 * s(357.5, 35999.05) - 0.11 * s(186.5, 966404.03)
  );
  const lat = rad(
    5.13 * s(93.3, 483202.02) + 0.28 * s(228.2, 960400.89)
      - 0.28 * s(318.3, 6003.15) - 0.17 * s(217.6, -407332.21)
  );
  const parallax = rad(
    0.9508 + 0.0518 * c(135.0, 477198.87) + 0.0095 * c(259.3, -413335.36)
      + 0.0078 * c(235.7, 890534.22) + 0.0028 * c(269.9, 954397.74)
  );
  const r = EARTH_EQUATORIAL_RADIUS_KM / Math.sin(parallax);
  const eps = rad(23.439291 - 0.013004 * T);

  // Ecliptic → equatorial
  const xe = Math.cos(lat) * Math.cos(lon);
  const ye = Math.cos(lat) * Math.sin(lon);
  const ze = Math.sin(lat);
  return {
    x: r * xe,
    y: r * (Math.cos(eps) * ye - Math.sin(eps) * ze),
    z: r * (Math.sin(eps) * ye + Math.cos(eps) * ze),
  };
}
