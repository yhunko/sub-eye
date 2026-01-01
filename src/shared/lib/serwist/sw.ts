import { defaultCache } from "@serwist/turbopack/worker";
import {
  Serwist,
  SerwistGlobalConfig,
  PrecacheEntry,
  CacheFirst,
} from "serwist";
import { registerPushNotificationsListeners } from "@/entities/push-notifications/lib/push-notifications.worker";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Change this attribute's name to your `injectionPoint`.
    // `injectionPoint` is an InjectManifest option.
    // See https://serwist.pages.dev/docs/build/configuring
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname === BrandfetchUtils.HOSTNAME,
      // CacheFirst is best for static assets like logos to save API hits.
      handler: new CacheFirst({
        cacheName: "brandfetch-images",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

registerPushNotificationsListeners();

serwist.addEventListeners();
