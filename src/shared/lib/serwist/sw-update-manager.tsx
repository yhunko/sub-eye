"use client";

import { useEffect, FC } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { toast } from "sonner";

const useServiceWorkerUpdate = () => {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (typeof window === "undefined" || !serwist) return;

    let isUpdating = false;

    const handleUpdate = () => {
      if (isUpdating) return;

      isUpdating = true;

      serwist.messageSkipWaiting();

      const handleControllerChange = () => {
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
        {
          once: true,
        },
      );

      // Fallback: if controllerchange doesn't fire within 3 seconds, reload anyway
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
        window.location.reload();
      }, 3000);
    };

    const handleWaiting = () => {
      toast("Update Available", {
        description:
          "A new version of the app is available. Please update to get the latest features.",
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Update Now",
          onClick: handleUpdate,
        },
      });
    };

    serwist.addEventListener("waiting", handleWaiting);

    return () => {
      serwist.removeEventListener("waiting", handleWaiting);
    };
  }, [serwist]);
};

export const SwUpdateManager: FC = () => {
  useServiceWorkerUpdate();

  return null;
};
