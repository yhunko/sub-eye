import { defaultCache } from "@serwist/vite/worker";
import {
  Serwist,
  NetworkOnly,
  type SerwistGlobalConfig,
  type PrecacheEntry,
  type RuntimeCaching,
} from "serwist";
import { registerPushListeners } from "./features/push-notifications/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Custom runtime caching that excludes API routes from SW caching.
 *
 * API data is managed by React Query persistence (IndexedDB) which
 * provides "instant cached render → background refetch" natively.
 * The default serwist cache uses NetworkFirst with a 10s timeout for /api/*,
 * which on slow mobile networks returns stale SW-cached API responses,
 * bypassing React Query's own staleness logic entirely.
 */
const runtimeCaching: RuntimeCaching[] = [
  // API routes: always go to network, no SW caching.
  // React Query persistence handles offline/cached data.
  {
    matcher: /\/api\/.*/i,
    handler: new NetworkOnly(),
  },
  // Everything else: use serwist defaults (fonts, images, JS, CSS, etc.)
  ...defaultCache.filter((entry) => {
    // Remove the default /api/ rule and the catch-all to avoid conflicts
    const pattern = entry.matcher;
    if (pattern instanceof RegExp) {
      return !pattern.source.includes("api") && pattern.source !== ".*";
    }
    return true;
  }),
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

registerPushListeners();

serwist.addEventListeners();
