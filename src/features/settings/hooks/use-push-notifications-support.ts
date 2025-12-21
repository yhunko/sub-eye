"use client";

import { useState, useEffect } from "react";

export const usePushNotificationsSupport = () => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Official Next.js example: https://nextjs.org/docs/app/guides/progressive-web-apps#2-implementing-web-push-notifications
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  return isSupported;
};
