# EarthOrbitVisualizer — Codebase Analysis & Improvement Plan

*Analysis date: 2026-06-10. Build status at time of analysis: `tsc --noEmit`, `next lint`, and `next build` all pass cleanly.*

This document catalogs weaknesses found in a full read of the codebase (all source, config, and markdown files) and lays out a phased plan to address them. Items are ordered by severity within each section.

---

## 1. What's already good

Worth stating so the plan doesn't throw it away:

- Clean separation of pure orbital math (`src/lib/`) from React components.
- Correct ECI→ECEF→scene transform pipeline, consistent across satellites, ground tracks, and the sun vector (`solar.ts` matches `eciToEcf` conventions).
- Instanced mesh for the satellite cloud (single draw call), shared `Float32Array` position buffer reused by the screen-space tap selector — a smart, allocation-free picking approach.
- Server-side TLE proxy with CDN caching headers, custom User-Agent for CelesTrak.
- Thoughtful mobile UX: safe-area insets, 44 px tap targets, collapsible/draggable panel.
- The learning-mode content (shell cards) is genuinely good educational material.

---

## 2. Critical issues (correctness & performance)

### C1. Simulation clock runs at ~half speed and churns the rAF loop
`SceneCanvas.tsx:88-102` — the clock effect lists `simTime` in its dependency array and calls `setSimTime` inside the rAF tick. Every tick therefore tears the effect down and re-creates it; the cleanup resets `lastTs` to `null`, so the next tick only records a timestamp without advancing time. The result alternates record/advance frames: **at "1×" the sim clock actually advances at roughly 0.5× real time**, and the rAF loop is cancelled and rescheduled every frame.

**Fix:** advance time inside a single stable rAF loop (or R3F `useFrame`) using refs; read `timeSpeed`/`playing` from refs or `useStore.getState()`. Publish `simTime` to the store at a low rate (see C2).

### C2. Every UI component re-renders at animation-frame rate
`setSimTime` updates the Zustand store ~60×/s, and **every consumer calls `useStore()` with no selector**, subscribing to the whole store. So `ControlPanel`, `InfoPanel`, `TimeControl`, `SearchPanel`, `LearningCard`, `OrbitalShells`, and `SceneCanvas` itself all re-render every frame, whether or not they display the clock. `InfoPanel`'s `useMemo` depends on `simTime`, so it also re-runs `twoline2satrec` every frame.

**Fix (two parts):**
1. Keep the high-frequency clock out of React state entirely: store it in a ref/external object that `useFrame` consumers read directly, and push a store update only ~1×/s for the UI clock display.
2. Use Zustand selectors everywhere (`useStore((s) => s.selectedSat)` etc.) so components subscribe only to what they render.

### C3. All satrecs are re-parsed every frame
`useAllTLEData` returns a fresh array from `flatMap` on every call. Because `SceneCanvas` re-renders every frame (C1/C2), `SatelliteCloud` receives a new `satellites` array identity each frame, which invalidates the `satrecCache` and `colors` `useMemo`s — **`twoline2satrec` runs for every satellite (potentially ~3,000) on every render**. This is likely the single largest CPU sink in the app.

**Fix:** memoize the merged array inside `useAllTLEData` (`useMemo` keyed on the seven per-category results + enabled set). Fixing C1/C2 removes the per-frame trigger; the memo makes it robust regardless.

### C4. GroundTrack recomputes 120 SGP4 propagations every frame
`GroundTrack.tsx:14-23` depends on raw `simTime`, unlike `OrbitalPath` (throttled to 1 min via `simMinute`) and `SatelliteTrail` (throttled to 20 s via `simSlice`). While a satellite is selected with ground track on, that's ~120 propagations × 60 fps on the main thread.

**Fix:** apply the same time-slicing throttle used by its siblings (per-minute is fine for a ground track).

### C5. `classifyAltitude` misclassifies half the GEO band, and eccentric orbits entirely
`tle.ts:50-55` — the `altitudeKm < MEO_MAX` (35,786) check runs *before* the GEO tolerance check (±500 km), so a satellite at 35,500 km returns `"MEO"` even though it's inside the intended GEO band. Only altitudes in [35,786, 36,286) can ever reach the GEO branch. Separately, classification uses a single instantaneous altitude snapshot, so a Molniya-type HEO satellite sampled near perigee is labeled "LEO" — the `"HEO"` label is nearly unreachable.

**Fix:** check GEO tolerance first; classify from orbital elements (`satrec.no` → semi-major axis, `satrec.ecco` for eccentricity) rather than instantaneous altitude, with HEO defined by eccentricity threshold.

### C6. Web Worker propagation (stated target) is not implemented
CLAUDE.md lists "Web Worker for SGP4 propagation (keeps main thread free)" as a key optimization and 60 fps with 5,000 satellites as a target. All propagation currently runs on the main thread inside `useFrame`. After C1–C4 land, this is the next ceiling-raiser: move batch propagation to a worker that fills a transferable `Float32Array` (or `SharedArrayBuffer`), with the render thread just consuming positions.

---

## 3. High-value functional gaps

### F1. PWA is half-built
The manifest, icons, and meta tags exist, but **there is no service worker** — `next-pwa` (promised in CLAUDE.md) isn't in `package.json`. The app is not installable-with-offline and caches nothing. Either add `next-pwa`/`serwist` with a Workbox config (cache shell, textures, last-good TLE response), or update CLAUDE.md to descope offline support.

### F2. Disabled categories are still fetched
`useAllTLEData` always runs all seven SWR hooks with active keys, so all seven CelesTrak categories download even when the user has them toggled off. Keep the fixed hook count (rules of hooks) but pass a conditional key: `useSWR(enabled ? url : null, …)`.

### F3. No error boundaries or meaningful error UX
A fetch failure surfaces only as a tiny "err" string in `CategoryFilter`; there's no retry affordance, no toast, and no React error boundary around the `Canvas` (a WebGL context loss or shader error currently white-screens the page). Add an error boundary wrapping `SceneCanvas`, and a visible "category failed to load — retry" state.

### F4. Time travel silently exceeds TLE validity
The "−1y" preset propagates TLEs a full year from epoch; SGP4 is meaningless at that range (CLAUDE.md itself notes ~days of validity). The InfoPanel already has a TLE-age warning — extend the same concept to the time controls: warn (or clamp) when |simTime − epoch| exceeds ~7 days. Also: `TIME_SPEEDS` has no reverse speeds; a "−10×" option is cheap and useful for an educational tool.

### F5. Camera jump uses wall-clock time, not sim time
`CameraJumper` (`SceneCanvas.tsx:45`) propagates the jump target at `new Date()` while the rest of the scene renders at `simTime`. If the user has scrubbed time, the camera flies to where the satellite *isn't*. Use the sim clock. Also, the jump animates `camera.lookAt` without updating the `OrbitControls` target, so the first drag after a jump snaps the view back toward Earth center — set `controls.target` at jump end.

### F6. Day/night rendering is incorrect
`Earth.tsx` applies the night-lights texture as a uniform `emissiveMap`, so city lights glow on the daylit side too. CLAUDE.md promises a sun-angle day/night blend. This needs a small custom shader (or `onBeforeCompile` patch) mixing day/night maps by `dot(normal, sunDir)`. Cloud layer could also rotate slowly for life.

### F7. User preferences don't persist
Enabled categories, launch-site toggles, and trail/orbit/track switches reset on every load. Zustand's `persist` middleware + a Set⇄array serializer is ~20 lines.

---

## 4. Code quality, conventions & project hygiene

- **Q1. Zero tests.** CLAUDE.md mandates co-located `*.test.ts`, and `src/lib/` is pure-function and ideal for it — yet no test runner is even installed. Add Vitest; first targets: `parseTLEText` (malformed input, 2-line format, blank lines), `parseTLEEpoch` (century rollover at 57), `classifyAltitude` (boundary cases — would have caught C5), `latLonToScene`/`eciToScene` (known fixtures), `solar.ts` (solstice/equinox sun direction sanity).
- **Q2. No CI.** No `.github/workflows`. Add a workflow running `type-check`, lint, tests, and build on PRs (Phase 6 in CLAUDE.md).
- **Q3. CLAUDE.md has drifted badly from reality.** It describes files that don't exist (`Atmosphere.tsx`, `useSatellitePositions.ts`, `CategoryBadge.tsx`, `tailwind.config.ts`), outdated CelesTrak URLs (SOCRATES/SATCAT vs. the actual `gp.php`), Next 14 (actual: 15), and a phase checklist frozen at "Phase 1 — current" while Phases 2–4 are essentially done. Stale agent/developer docs actively mislead future work — rewrite to match the code.
- **Q4. Adding a category touches four hand-synced places:** the `OrbitCategory` union, `CELESTRAK_GROUPS`, the seven hard-coded hooks in `useAllTLEData`, and the initial Set in `useStore`. Derive the union from `CELESTRAK_GROUPS` (`as const` + `typeof`), derive the default Set from it, and drive `useAllTLEData` from the list (fixed-length, so hook order stays stable).
- **Q5. Convention violations vs. CLAUDE.md:** heavy inline `style` objects in `LaunchSites.tsx` and `LearningCard.tsx` ("No inline styles — Tailwind classes only"); `SearchPanel.tsx` re-implements a local `cn()` instead of importing `@/lib/utils`.
- **Q6. Dead/incorrect constants:** `CELESTRAK_BASE` in `constants.ts` is unused and points at the wrong endpoint; `orbitalVelocityKms` hardcodes `6371` instead of `EARTH_RADIUS_KM`.
- **Q7. Typing nit:** in `route.ts`, `.filter(Boolean)` doesn't narrow `(SatelliteRecord | null)[]`; use a type-guard filter so the response type is honest.
- **Q8. `next lint` is deprecated** (warns at runtime, removed in Next 16) — migrate to the ESLint CLI per the codemod. Also set `metadataBase` to silence the build warning and fix OG image URLs in production.
- **Q9. Accessibility:** the launch-sites master toggle is a `role="checkbox"` span nested *inside* a `<button>` (nested interactive controls — invalid and unreachable by keyboard); icon buttons rely on emoji glyphs; satellites can only be selected by pointer (search partially compensates). Fix the nesting, add `aria-label`s, and ensure all toggles are tabbable.
- **Q10. README is two lines.** No setup steps, screenshot, feature list, or link to live deployment. For a portfolio-grade project this is the first thing visitors see.
- **Q11. `vercel.json` is entirely redundant** (restates Vercel's Next.js defaults) — delete or leave; zero risk either way.
- **Q12. SWR retry/cache asymmetry:** dev-server requests hit CelesTrak directly on every reload (the CDN `s-maxage` only helps deployed environments). Consider an in-memory/server cache in the route handler so local dev doesn't hammer CelesTrak.

---

## 5. Phased plan

### Phase A — Correctness & frame-rate fixes (small diffs, biggest payoff)
1. Rework the sim clock: single stable rAF/`useFrame` driver, time in a ref, ~1 Hz store publication (fixes C1, half of C2).
2. Convert all `useStore()` calls to selector form (C2).
3. Memoize the merged satellite array in `useAllTLEData` (C3); conditional SWR keys for disabled categories (F2).
4. Throttle `GroundTrack` recomputation (C4).
5. Fix `classifyAltitude` ordering + element-based classification (C5); fix camera jump to use sim time and update controls target (F5).

### Phase B — Test & CI safety net
6. Add Vitest + first test suite over `src/lib/` (Q1) — write the C5 boundary tests as regression proof.
7. GitHub Actions workflow: type-check, lint (migrated off `next lint`, Q8), test, build (Q2).
8. Rewrite CLAUDE.md to match reality; flesh out README (Q3, Q10).

### Phase C — Visual & UX correctness
9. Day/night terminator shader for Earth; rotating cloud layer (F6).
10. Error boundary around the canvas + per-category retry UI (F3).
11. TLE-validity warning in time controls; optional reverse speeds (F4).
12. Persist preferences with Zustand `persist` (F7).
13. Accessibility pass (Q9) and inline-style cleanup (Q5).

### Phase D — Scale & PWA
14. Web Worker SGP4 propagation with transferable position buffers (C6) — unlocks the 5k-satellite/60 fps target and full Starlink display.
15. Service worker via `next-pwa`/`serwist`: app-shell + texture caching, last-good TLE fallback for offline (F1).
16. Category-config consolidation (Q4) and remaining hygiene items (Q6, Q7, Q11, Q12).

Each phase is independently shippable; Phase A alone should roughly double effective frame budget and fix the user-visible clock-speed bug.
