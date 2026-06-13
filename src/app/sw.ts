import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected at build time by @serwist/next
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Earth textures: large, immutable — cache-first
      matcher: ({ url }) => url.pathname.startsWith("/textures/"),
      handler: new CacheFirst({
        cacheName: "earth-textures",
        plugins: [
          new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 30 * 24 * 3600 }),
        ],
      }),
    },
    {
      // TLE data: prefer fresh, fall back to the last good response offline
      matcher: ({ url }) => url.pathname.startsWith("/api/satellites"),
      handler: new NetworkFirst({
        cacheName: "tle-data",
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 7 * 24 * 3600 }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
