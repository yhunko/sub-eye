"use client";

import { useEffect, FC } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { toast } from "sonner";

const useServiceWorkerUpdate = () => {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (typeof window === "undefined" || !serwist) return;

    const onUpdateFound = () => {
      toast("Update Available", {
        description:
          "A new version of the app is available. Please update to get the latest features.",
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Update Now",
          onClick: () => {
            serwist.messageSkipWaiting();
          },
        },
      });
    };

    const onControllerChange = () => {
      window.location.reload();
    };

    serwist.addEventListener("waiting", onUpdateFound);
    serwist.addEventListener("controlling", onControllerChange);

    return () => {
      serwist.removeEventListener("waiting", onUpdateFound);
      serwist.removeEventListener("controlling", onControllerChange);
    };
  }, [serwist]);
};

export const SwUpdateManager: FC = () => {
  useServiceWorkerUpdate();

  return null;
};
