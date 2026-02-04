import { useEffect, useState } from "react";
import { useOs } from "@mantine/hooks";

export function useApplePushNotificationsSupport() {
  const os = useOs();
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check if we are in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // If it's iOS, we consider it "supported" (ready for push) ONLY if it's standalone.
    // If it's not iOS, we assume true (or handled by other hooks) but for this specific hook
    // which drives the "Install Prompt", we care about iOS state.
    // Legacy logic: Show prompt if iOS and NOT supported.
    // So Unsupported = Not Standalone.
    // Supported = Standalone.

    if (os === "ios") {
      setIsSupported(isStandalone);
    } else {
      // If not iOS, this hook's result regarding "Apple Push" is irrelevant or effectively "supported"
      // in the sense that we don't need to show the Apple Install Prompt.
      setIsSupported(true);
    }
  }, [os]);

  return isSupported;
}
