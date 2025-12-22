export class ServiceWorkerUtils {
  static async getRegistration() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    return await navigator.serviceWorker.ready;
  }
}
