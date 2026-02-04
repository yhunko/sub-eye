import { defaultCache } from "@serwist/vite/worker";
import { Serwist, type SerwistGlobalConfig, type PrecacheEntry } from "serwist";
import { registerPushListeners } from "./features/push-notifications/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
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

registerPushListeners();

serwist.addEventListeners();
