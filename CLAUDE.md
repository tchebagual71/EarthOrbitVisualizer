# EarthOrbitVisualizer — Developer Guide

## Project Overview

A Progressive Web App (PWA) that visualizes, realistically and to scale, the locations of objects in Earth orbit. Users can explore LEO, MEO, GEO, and HEO orbital shells, track real satellites using live TLE data, and interact with the 3D scene in real time.

**Live URL:** TBD (Vercel deployment, auto-deployed from `main`)

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | File-based routing, API routes, edge-ready, native Vercel support |
| Language | TypeScript (strict) | Type safety for orbital math and 3D coordinate transforms |
| 3D Engine | Three.js via React Three Fiber (`@react-three/fiber`) | Declarative Three.js in React; large ecosystem |
| 3D Helpers | `@react-three/drei` | OrbitControls, Line, Text, useTexture, Instances, etc. |
| Orbital Math | `satellite.js` | SGP4/SDP4 propagator; TLE → ECI position vectors |
| Styling | Tailwind CSS + `tailwind-merge` | Utility-first; zero runtime CSS |
| UI Primitives | `shadcn/ui` (Radix) | Accessible, headless components |
| State | Zustand | Lightweight; no boilerplate; works with R3F's render loop |
| PWA | `next-pwa` (Workbox) | Service worker, offline caching |
| Data Source | CelesTrak GZIP feeds | Free, no auth, updated multiple times daily |
| Deployment | Vercel (free tier) | Native Next.js, edge network, zero-config |

---

## Repository Structure

```
EarthOrbitVisualizer/
├── CLAUDE.md                    ← this file
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── public/
│   ├── manifest.json            ← PWA manifest
│   ├── icons/                   ← PWA icons (192, 512)
│   └── textures/                ← Earth textures (day, night, clouds, specular)
└── src/
    ├── app/
    │   ├── layout.tsx            ← Root layout, PWA meta tags, fonts
    │   ├── page.tsx              ← Main page (full-screen visualizer)
    │   ├── globals.css
    │   └── api/
    │       └── satellites/
    │           └── route.ts      ← Server-side TLE proxy (avoids CORS + caches)
    ├── components/
    │   ├── scene/
    │   │   ├── SceneCanvas.tsx   ← R3F Canvas with camera, lights, postprocessing
    │   │   ├── Earth.tsx         ← Textured Earth sphere
    │   │   ├── Atmosphere.tsx    ← Shader-based atmospheric glow
    │   │   ├── OrbitalShells.tsx ← Translucent LEO/MEO/GEO altitude rings
    │   │   ├── SatelliteCloud.tsx← Instanced mesh for 10k+ satellites
    │   │   └── OrbitalPath.tsx   ← Single satellite's orbital trajectory line
    │   └── ui/
    │       ├── ControlPanel.tsx  ← Left sidebar: filters, settings
    │       ├── InfoPanel.tsx     ← Right panel: selected satellite details
    │       ├── TimeControl.tsx   ← Bottom bar: play/pause, speed, scrub
    │       ├── CategoryBadge.tsx ← Colored orbit-category pill
    │       └── LoadingOverlay.tsx
    ├── hooks/
    │   ├── useTLEData.ts         ← Fetch + parse TLE from API route; SWR cache
    │   ├── useSatellitePositions.ts ← Compute ECI→scene positions each frame
    │   └── useStore.ts           ← Zustand store (selected sat, filters, time)
    ├── lib/
    │   ├── constants.ts          ← EARTH_RADIUS_KM, SCENE_SCALE, orbit ranges
    │   ├── coordinates.ts        ← ECI → ECEF → Three.js XYZ transforms
    │   ├── tle.ts                ← TLE fetch/parse helpers
    │   └── categories.ts         ← CelesTrak group URLs + color/label config
    └── types/
        └── satellite.ts          ← SatelliteRecord, OrbitalElements, etc.
```

---

## Orbital Mechanics Notes

### Coordinate Systems

1. **ECI (Earth-Centered Inertial)** — output of `satellite.js` propagation; X toward vernal equinox, Z toward north pole; unit = km
2. **ECEF (Earth-Centered Earth-Fixed)** — rotates with Earth; used for ground tracks
3. **Three.js Scene** — Y-up, scaled by `SCENE_SCALE = 1/1000` (1 Three.js unit = 1000 km)

### Key Transform (ECI → Scene)

```ts
// satellite.js returns ECI position in km
const posEci = satellite.propagate(satrec, date).position;
// ECI→ECEF (accounts for Earth rotation)
const gmst = satellite.gstime(date);
const posEcef = satellite.eciToEcef(posEci, gmst);
// Scale to scene units (X=east, Y=north→up, Z=toward viewer)
return new THREE.Vector3(
  posEcef.x * SCENE_SCALE,
  posEcef.z * SCENE_SCALE,   // Z_ecef → Y_scene (north = up)
  -posEcef.y * SCENE_SCALE,  // Y_ecef → -Z_scene
);
```

### Orbit Classification (altitude above surface)

| Class | Alt range | Example |
|---|---|---|
| LEO | 160 – 2000 km | ISS (408 km), Starlink (550 km) |
| MEO | 2000 – 35786 km | GPS (20200 km) |
| GEO | ~35786 km | Weather sats, TV broadcast |
| HEO | Highly elliptical | Molniya orbits |

---

## Data Sources

All TLE data comes from CelesTrak (no API key required):

```ts
// src/lib/categories.ts
export const CELESTRAK_GROUPS = {
  stations:  'https://celestrak.org/SOCRATES/query.php?...', // ISS, CSS
  starlink:  'https://celestrak.org/SATCAT/groups/starlink.txt',
  gps:       'https://celestrak.org/SATCAT/groups/gps-ops.txt',
  weather:   'https://celestrak.org/SATCAT/groups/weather.txt',
  debris:    'https://celestrak.org/SATCAT/groups/cosmos-2251-debris.txt',
  // ... etc
};
```

The API route at `/api/satellites` fetches these on the server (avoids CORS), caches the response for 1 hour, and returns parsed records.

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build locally
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

---

## Environment Variables

Create `.env.local` for local dev:

```env
# Optional: override CelesTrak base URL (e.g. for a mirror)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vercel env vars (set in dashboard):
```
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

---

## PWA Configuration

- **Manifest:** `public/manifest.json` — app name, icons, theme color, display: standalone
- **Service Worker:** generated by `next-pwa` via Workbox; caches JS/CSS/textures
- **Offline:** Shows cached Earth + placeholder text if network unavailable
- **Icons:** 192×192 and 512×512 in `public/icons/`

---

## Deployment (Vercel)

1. Push branch → Vercel auto-deploys preview URL
2. Merge to `main` → production deployment
3. Custom domain: add in Vercel Dashboard → Domains
4. No environment secrets needed for basic operation (CelesTrak is public)

---

## Performance Targets

| Metric | Target |
|---|---|
| FPS (desktop) | 60 fps with 5000 satellites |
| FPS (mobile) | 30 fps with 1000 satellites |
| Initial load | < 3 s on 4G |
| TLE fetch + parse | < 500 ms |

### Key optimizations

- **Instanced mesh** for satellites (single draw call for thousands of points)
- **LOD:** hide orbital paths when > 200 satellites visible
- **Frustum culling** via Three.js default
- **Web Worker** for SGP4 propagation (keeps main thread free)
- **SWR** for TLE caching with stale-while-revalidate pattern
- **Next.js** dynamic imports with `ssr: false` for all Three.js components

---

## Code Conventions

- **Strict TypeScript** — no `any`, explicit return types on all functions
- **Named exports** everywhere (no default exports except page components)
- **Co-located tests** — `*.test.ts` next to the file it tests
- **Orbital math utilities** are pure functions in `src/lib/` — easy to unit test
- **No inline styles** — Tailwind classes only
- **Commit messages:** `feat:`, `fix:`, `chore:`, `docs:` prefixes

---

## Implementation Phases

### Phase 1 — Foundation (current)
- [x] Repo initialized
- [ ] Next.js scaffold + config
- [ ] Basic Earth sphere (Three.js)
- [ ] OrbitControls + lighting

### Phase 2 — Data Layer
- [ ] CelesTrak API route
- [ ] satellite.js integration
- [ ] ECI → scene coordinate transform

### Phase 3 — Visualization
- [ ] Earth day/night textures
- [ ] Satellite instanced mesh
- [ ] Orbital path lines

### Phase 4 — Interactivity
- [ ] Category filter UI
- [ ] Satellite selection + InfoPanel
- [ ] Time control (play/pause/speed)
- [ ] Altitude ring labels

### Phase 5 — PWA + Polish
- [ ] next-pwa + manifest
- [ ] Responsive mobile layout
- [ ] Loading states + error boundaries

### Phase 6 — Deployment
- [ ] Vercel project setup
- [ ] CI on push to main
- [ ] Live URL confirmed

---

## Known Constraints & Decisions

- **CelesTrak rate limits:** their API is generous but not unlimited; the server-side cache (1 hr) prevents abuse
- **TLE accuracy:** SGP4 is accurate to ~1 km over short periods; good enough for visualization
- **Earth textures:** using NASA Blue Marble (public domain); day + night texture blend based on sun angle
- **No WebGPU yet:** Three.js WebGPURenderer is promising but still experimental; stick with WebGL2
- **satellite.js note:** the `propagate()` function returns `false` for decayed satellites — always check before rendering
