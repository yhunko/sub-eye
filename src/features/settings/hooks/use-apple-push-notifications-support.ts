import { useEffect, useState } from "react";

export const useApplePushNotificationsSupport = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Official Next.js example: https://nextjs.org/docs/app/guides/progressive-web-apps#2-implementing-web-push-notifications
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  return isStandalone;
};
