import { defaultCache } from "@serwist/turbopack/worker";
import { Serwist, SerwistGlobalConfig, PrecacheEntry } from "serwist";
import { registerPushNotificationsListeners } from "@/entities/push-notifications/lib/push-notifications.worker";

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
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

registerPushNotificationsListeners();

serwist.addEventListeners();
