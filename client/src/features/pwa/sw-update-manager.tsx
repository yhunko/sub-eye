import { getSerwist } from "virtual:serwist";
import type { Serwist } from "@serwist/window";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function SwUpdateManager() {
  // Use ref to store the instance for cleanup
  const serwistRef = useRef<Serwist | undefined>(undefined);

  useEffect(() => {
    let unmount = false;

    let waitingHandler: (() => void) | undefined;
    let controllingHandler: (() => void) | undefined;
    let updateInitiated = false;

    const loadSerwist = async () => {
      if (!("serviceWorker" in navigator)) return;

      const serwist = await getSerwist();
      if (unmount || !serwist) return;

      serwistRef.current = serwist;

      waitingHandler = () => {
        toast("Update Available", {
          description: "A new version of the app is available.",
          action: {
            label: "Update Now",
            onClick: () => {
              updateInitiated = true;
              serwist.messageSkipWaiting();
            },
          },
          duration: Infinity,
        });
      };

      controllingHandler = () => {
        if (updateInitiated) {
          window.location.reload();
        }
      };

      serwist.addEventListener("waiting", waitingHandler);
      serwist.addEventListener("controlling", controllingHandler);

      void serwist.register();
    };

    void loadSerwist();

    return () => {
      unmount = true;
      if (serwistRef.current) {
        if (waitingHandler) {
          serwistRef.current.removeEventListener("waiting", waitingHandler);
        }
        if (controllingHandler) {
          serwistRef.current.removeEventListener(
            "controlling",
            controllingHandler,
          );
        }
      }
    };
  }, []);

  return null;
}
