# Earth Orbit Visualizer

An interactive, to-scale 3D visualization of objects in Earth orbit, running in the browser. Track real satellites propagated from live [CelesTrak](https://celestrak.org) TLE data, explore the LEO/MEO/GEO orbital shells, inspect launch sites around the globe, and fast-forward time to watch constellations move.

## Features

- **Real satellite tracking** — Space stations, Starlink, GPS, weather, GEO belt, amateur, and debris groups, propagated with SGP4 (`satellite.js`) and rendered to scale (1 scene unit = 1,000 km)
- **Time control** — play/pause, speeds from 1× to 1 hour/second, and jump-to presets
- **Satellite inspector** — tap any satellite for altitude, inclination, period, velocity, orbit class, and TLE freshness, plus its orbital path, 30-minute trail, and surface ground track
- **Launch site atlas** — 36 sites worldwide, color-coded by type, with zoom-in labels and detail cards
- **Learning mode** — guided cards explaining each orbital shell (LEO, Van Allen boundary, MEO, GEO)
- **Search** — press `/` to find any satellite (name or NORAD ID) or launch site, with camera fly-to
- **Day/night sun** — directional lighting follows the real solar position for the simulated time

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run test       # unit tests (Vitest)
npm run lint       # ESLint
npm run type-check # TypeScript
```

No API keys or environment variables are required — TLE data is proxied through `/api/satellites` from CelesTrak's free GP API and cached for an hour.

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Three.js via React Three Fiber · satellite.js (SGP4) · Zustand · SWR · Tailwind CSS 4 · Vitest

Architecture notes, orbital-mechanics conventions, and the contributor guide live in [CLAUDE.md](CLAUDE.md). The current roadmap is in [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md).

## Data & Attribution

- Orbital elements: [CelesTrak](https://celestrak.org) GP API (updated multiple times daily)
- Earth textures: NASA Blue Marble (public domain)

## License

Apache 2.0 — see [LICENSE](LICENSE).
