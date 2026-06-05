import { useOs } from "@mantine/hooks";

export function useApplePushNotificationsSupport() {
  const os = useOs();

  // Check if we are in standalone mode (installed PWA)
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  // If it's iOS, support depends on standalone mode; otherwise this check is irrelevant.
  return os === "ios" ? isStandalone : true;
}
