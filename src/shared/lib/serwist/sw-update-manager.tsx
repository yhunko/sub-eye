// sw-update-manager.tsx
"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { toast } from "sonner";

const TOAST_ID = "sw-update";

export function SwUpdateManager() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;

    const handleWaiting = () => {
      toast.dismiss(TOAST_ID);
      toast("Update Available", {
        id: TOAST_ID,
        description:
          "A new version of the app is available. Please update to get the latest features.",
        duration: Infinity,
        action: {
          label: "Update Now",
          onClick: () => serwist.messageSkipWaiting(),
        },
      });
    };

    const handleControlling = () => {
      window.location.reload();
    };

    serwist.addEventListener("waiting", handleWaiting);
    serwist.addEventListener("controlling", handleControlling);

    return () => {
      serwist.removeEventListener("waiting", handleWaiting);
      serwist.removeEventListener("controlling", handleControlling);
    };
  }, [serwist]);

  return null;
}
