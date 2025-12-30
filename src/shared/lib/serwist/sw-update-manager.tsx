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
            window.location.reload();
          },
        },
      });
    };

    // 'waiting' is the state where a new SW is installed but not active
    serwist.addEventListener("waiting", onUpdateFound);

    return () => {
      serwist.removeEventListener("waiting", onUpdateFound);
    };
  }, [serwist]);
};

export const SwUpdateManager: FC = () => {
  useServiceWorkerUpdate();

  return null;
};
