declare const self: ServiceWorkerGlobalScope;

export const registerPushListeners = () => {
  self.addEventListener("push", (event: PushEvent) => {
    if (event.data) {
      try {
        const data = event.data.json();
        const options: NotificationOptions = {
          body: data.body,
          icon: data.icon || "/assets/pwa/web-app-manifest-192x192.png",
          data: data.data || {
            dateOfArrival: Date.now(),
          },
        };
        event.waitUntil(
          self.registration.showNotification(data.title, options),
        );
      } catch {
        console.error("Failed to parse push notification data");
      }
    }
  });

  self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && "focus" in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(urlToOpen);
          }
        }),
    );
  });
};
