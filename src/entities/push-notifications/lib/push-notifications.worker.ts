declare const self: ServiceWorkerGlobalScope;

export const registerPushNotificationsListeners = () => {
  self.addEventListener("push", (event) => {
    if (event.data) {
      try {
        const data = event.data.json();
        const options: NotificationOptions = {
          body: data.body,
          icon: data.icon || "/android-chrome-512x512.png",
          data: data.data || {
            dateOfArrival: Date.now(),
          },
        };
        event.waitUntil(
          self.registration.showNotification(data.title, options),
        );
      } catch {
        // Currently used for local testing of push service
        const title = event.data.text();
        const options = {
          icon: "/android-chrome-512x512.png",
          data: {
            dateOfArrival: Date.now(),
          },
        };

        event.waitUntil(self.registration.showNotification(title, options));
      }
    }
  });

  self.addEventListener("notificationclick", (event) => {
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
