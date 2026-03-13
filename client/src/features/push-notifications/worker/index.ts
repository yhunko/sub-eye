import { AppAssetUrls } from "shared";

declare const self: ServiceWorkerGlobalScope;

const APP_ICON = AppAssetUrls.pwaIcon192;

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
};

const resolveAppUrl = (rawUrl?: string): URL => {
  const fallback = new URL("/", self.location.origin);

  if (!rawUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
};

export const registerPushListeners = () => {
  self.addEventListener("push", (event: PushEvent) => {
    if (event.data) {
      try {
        const data = event.data.json() as PushPayload;
        const title = data.title?.trim() || "Subscription Update";
        const options: NotificationOptions = {
          body: data.body,
          icon: data.icon || APP_ICON,
          badge: data.badge || APP_ICON,
          tag: data.tag,
          requireInteraction: data.requireInteraction,
          data: data.data || {
            dateOfArrival: Date.now(),
          },
        };
        event.waitUntil(self.registration.showNotification(title, options));
      } catch {
        console.error("Failed to parse push notification data");
      }
    }
  });

  self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();
    const targetUrl = resolveAppUrl(event.notification.data?.url);
    const targetUrlString = targetUrl.toString();

    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === targetUrlString && "focus" in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrlString);
          }
        }),
    );
  });
};
