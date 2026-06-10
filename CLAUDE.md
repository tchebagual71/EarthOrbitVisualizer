# EarthOrbitVisualizer — Developer Guide

## Project Overview

A web app (PWA-in-progress) that visualizes, realistically and to scale, the locations of objects in Earth orbit. Users can explore LEO/MEO/GEO orbital shells with educational "learning cards", track real satellites using live CelesTrak TLE data, inspect launch sites worldwide, search everything, and control simulation time.

**Live URL:** TBD (Vercel deployment, auto-deployed from `main`)

See `IMPROVEMENT_PLAN.md` for the current analysis-driven roadmap (Phases A–D).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | File-based routing, API routes, edge-ready, native Vercel support |
| Language | TypeScript (strict) | Type safety for orbital math and 3D coordinate transforms |
| UI | React 19 | |
| 3D Engine | Three.js via React Three Fiber (`@react-three/fiber` v9) | Declarative Three.js in React |
| 3D Helpers | `@react-three/drei` | OrbitControls, Line, Html, Stars, etc. |
| Orbital Math | `satellite.js` v5 | SGP4/SDP4 propagator; TLE → ECI position vectors |
| Styling | Tailwind CSS v4 (PostCSS plugin) + `clsx`/`tailwind-merge` (`cn()` in `src/lib/utils.ts`) | Utility-first |
| State | Zustand v5 | Lightweight; subscribe via **selectors only** (see Conventions) |
| Data fetching | SWR | Stale-while-revalidate caching of the TLE API route |
| Data Source | CelesTrak GP API | Free, no auth, updated multiple times daily |
| Testing | Vitest | Co-located `*.test.ts` next to `src/lib` modules |
| Deployment | Vercel | Native Next.js |

Not currently used (despite earlier plans): shadcn/ui, `next-pwa` (manifest + icons exist, but there is **no service worker yet** — see Phase D).

---

## Repository Structure

```
EarthOrbitVisualizer/
├── CLAUDE.md                     ← this file
├── IMPROVEMENT_PLAN.md           ← analysis + phased roadmap
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts                ← API cache headers
├── vitest.config.ts              ← node env, @/ alias
├── eslint.config.mjs             ← flat config, ESLint CLI (`npm run lint`)
├── vercel.json
├── .github/workflows/ci.yml     ← type-check, lint, test, build
├── scripts/download-textures.sh
├── public/
│   ├── manifest.json             ← PWA manifest (no service worker yet)
│   ├── icons/                    ← PWA icons (192, 512)
│   └── textures/                 ← earth-day/night/clouds/normal.jpg
└── src/
    ├── app/
    │   ├── layout.tsx            ← metadata, PWA meta tags, fonts
    │   ├── page.tsx              ← full-screen visualizer + HUD overlays
    │   ├── globals.css
    │   └── api/satellites/route.ts ← edge-runtime TLE proxy (CORS + CDN cache)
    ├── components/
    │   ├── scene/
    │   │   ├── SceneCanvas.tsx   ← R3F Canvas, SimClockDriver, CameraJumper, tap-select wiring
    │   │   ├── Earth.tsx         ← textured sphere + clouds + simple atmosphere shell
    │   │   ├── SunLight.tsx      ← directional light driven by solar position
    │   │   ├── OrbitalShells.tsx ← translucent altitude spheres + SHELL_DEFS learning content
    │   │   ├── SatelliteCloud.tsx← instanced mesh; writes shared position buffer per frame
    │   │   ├── SatelliteSelector.tsx ← screen-space nearest-satellite tap picking
    │   │   ├── OrbitalPath.tsx   ← selected sat's orbit line (recomputes per sim-minute)
    │   │   ├── GroundTrack.tsx   ← surface-projected track (recomputes per sim-minute)
    │   │   ├── SatelliteTrail.tsx← 30-min fading history (recomputes per 20 sim-sec)
    │   │   └── LaunchSites.tsx   ← site markers, hover/click tooltips, zoom-gated labels
    │   └── ui/
    │       ├── ControlPanel.tsx  ← draggable left panel: categories, sites, shells
    │       ├── CategoryFilter.tsx
    │       ├── InfoPanel.tsx     ← selected satellite details + TLE age warning
    │       ├── TimeControl.tsx   ← play/pause, speeds, presets, clock
    │       ├── SearchPanel.tsx   ← '/' fuzzy search over satellites + launch sites
    │       ├── LearningCard.tsx  ← orbital shell education modal
    │       └── LoadingOverlay.tsx
    ├── hooks/
    │   ├── useTLEData.ts         ← SWR fetch per category; memoized merge; null key when disabled
    │   └── useStore.ts           ← Zustand store (selection, filters, time, UI state)
    ├── lib/                      ← pure, unit-tested modules
    │   ├── constants.ts          ← EARTH_RADIUS_KM, SCENE_SCALE_KM, ORBIT_BOUNDARIES, TIME_SPEEDS
    │   ├── simClock.ts           ← sim time outside React (see Time Architecture)
    │   ├── coordinates.ts        ← ECI→ECEF→scene transforms, propagation helpers (+tests)
    │   ├── solar.ts              ← low-precision solar position (+tests)
    │   ├── tle.ts                ← TLE parse/classify/derive helpers (+tests)
    │   ├── categories.ts         ← CelesTrak group URLs + color/label/maxDisplay config
    │   ├── launchsites.ts        ← static launch-site database (36 sites)
    │   └── utils.ts              ← cn()
    └── types/satellite.ts        ← SatelliteRecord, OrbitCategory, CelestrakGroup, …
```

---

## Time Architecture (important)

Simulation time is **not** React state at frame rate:

- `src/lib/simClock.ts` holds the authoritative sim time as module state (`getSimMs/getSimTime/setSimMs/advanceSimMs`).
- `SimClockDriver` (inside the Canvas, `SceneCanvas.tsx`) advances it every frame via `useFrame`, reading `playing`/`timeSpeed` from `useStore.getState()`.
- Per-frame consumers (`SatelliteCloud`, `SunLight`) read the clock directly inside `useFrame` — no re-renders.
- The driver publishes a snapshot to the store's `simTime` only when the displayed second changes (throttled to ≥200 ms real time at high speeds). UI components (clock, TLE age) subscribe to that low-rate `simTime`.
- Scrubbing goes through the store's `setSimTime`, which writes through to the clock.

Do not reintroduce per-frame `set()` calls into the store — that was the cause of a half-speed clock and app-wide 60 fps re-renders (see IMPROVEMENT_PLAN.md C1/C2).

---

## Orbital Mechanics Notes

### Coordinate Systems

1. **ECI (Earth-Centered Inertial)** — output of `satellite.js` propagation; X toward vernal equinox, Z toward north pole; unit = km
2. **ECEF (Earth-Centered Earth-Fixed)** — rotates with Earth; the scene is ECEF-aligned (the Earth mesh is stationary; the sun light moves)
3. **Three.js Scene** — Y-up, scaled by `SCENE_SCALE_KM = 1000` (1 scene unit = 1000 km)

### Key Transform (ECI → Scene) — `src/lib/coordinates.ts`

```ts
const gmst = satellite.gstime(date);
const posEcef = satellite.eciToEcf(posEci, gmst);
return {
  x: posEcef.x / SCENE_SCALE_KM,
  y: posEcef.z / SCENE_SCALE_KM,   // Z_ecef → Y_scene (north pole = up)
  z: -posEcef.y / SCENE_SCALE_KM,  // Y_ecef → -Z_scene
};
```

### Orbit Classification — `src/lib/tle.ts`

`classifyOrbit(satrec)` uses mean elements (semi-major axis from mean motion, eccentricity): e > 0.25 → HEO; mean altitude within ±500 km of 35,786 → GEO; < 2,000 → LEO; < 35,786 → MEO; else HEO. `classifyAltitude(km)` is the snapshot fallback (GEO band checked first — order matters).

| Class | Alt range | Example |
|---|---|---|
| LEO | 160 – 2000 km | ISS (~410 km), Starlink (550 km) |
| MEO | 2000 – 35786 km | GPS (20,200 km) |
| GEO | 35786 ± 500 km | Weather sats, TV broadcast |
| HEO | e > 0.25 or above GEO | Molniya orbits |

---

## Data Sources

All TLE data comes from CelesTrak's GP API (no key required) — see `src/lib/categories.ts`:

```ts
https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=TLE          // most groups
https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle  // starlink
```

Current categories: stations, starlink (max 2000), gps, weather, geo, amateur, debris (cosmos-2251). Each entry defines `url`, `color`, `label`, `maxDisplay`.

The edge API route at `/api/satellites?category=<id>` fetches server-side (avoids CORS), parses TLEs into `SatelliteRecord`s, and sets `Cache-Control: s-maxage=3600, stale-while-revalidate=7200` for the CDN. Client-side, SWR dedupes for 1 hour and disabled categories use a null key (not fetched).

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build locally
npm run lint         # ESLint (flat config, eslint CLI)
npm run test         # Vitest, single run
npm run test:watch   # Vitest watch mode
npm run type-check   # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs type-check → lint → test → build on PRs and pushes to `main`.

---

## Code Conventions

- **Strict TypeScript** — no `any`, explicit return types on exported functions
- **Named exports** everywhere (default exports only for `page.tsx`/`layout.tsx`)
- **Zustand: selector subscriptions only** — `useStore((s) => s.field)`, never bare `useStore()` destructuring (whole-store subscription causes app-wide re-renders)
- **Per-frame data lives outside React state** — refs, module state (`simClock`), shared typed arrays (`positionsRef`)
- **Orbital math utilities** are pure functions in `src/lib/` with co-located `*.test.ts`
- **Tailwind classes** preferred over inline styles (legacy inline styles remain in `LaunchSites`/`LearningCard` — cleanup tracked in IMPROVEMENT_PLAN.md Q5)
- **Commit messages:** `feat:`, `fix:`, `chore:`, `docs:` prefixes

---

## Performance Targets & Current Approach

| Metric | Target |
|---|---|
| FPS (desktop) | 60 fps with 5000 satellites |
| FPS (mobile) | 30 fps with 1000 satellites |
| Initial load | < 3 s on 4G |

- **Instanced mesh** for satellites (single draw call); per-frame SGP4 on the main thread (Web Worker migration is Phase D)
- Selected-satellite overlays recompute on coarse sim-time slices, not per frame (orbit/track: 1 min; trail: 20 s)
- Satellite list identity is stable (memoized in `useAllTLEData`) so satrec caches survive renders
- Dynamic import with `ssr: false` for the canvas

---

## Known Constraints & Decisions

- **CelesTrak rate limits:** generous but not unlimited; CDN cache (1 hr) prevents abuse. Dev-server requests bypass the CDN cache.
- **TLE accuracy:** SGP4 is ~1 km over short periods; degrades over days. InfoPanel shows a staleness warning past 7 days. Time presets can exceed TLE validity (warning UI tracked as F4).
- **`satellite.propagate()` returns no/boolean position for decayed satellites** — always check before rendering (`propagateAt` returns `null`). `twoline2satrec` does **not** throw on malformed lines; it yields NaN propagation — `tleToSatelliteRecord` rejects non-finite results.
- **Earth textures:** NASA Blue Marble (public domain). Night lights are currently a uniform emissive map (day/night terminator shader tracked as F6).
- **No WebGPU:** stick with WebGL2.

---

## Roadmap

Tracked in `IMPROVEMENT_PLAN.md`:

- [x] Phase A — correctness & frame-rate fixes (sim clock, selectors, memoization, classification)
- [x] Phase B — Vitest suite, CI workflow, documentation rewrite
- [ ] Phase C — day/night shader, error boundaries, TLE-validity warnings, persisted prefs, a11y
- [ ] Phase D — Web Worker propagation, service worker/PWA, category-config consolidation
