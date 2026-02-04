import { useEffect, useState } from "react";

export function usePushNotificationsSupport() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );
  }, []);

  return isSupported;
}
