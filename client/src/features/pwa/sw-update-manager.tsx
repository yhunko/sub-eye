import { useEffect, useRef } from "react";
import type { Serwist } from "@serwist/window";
import { getSerwist } from "virtual:serwist";
import { toast } from "sonner";

export function SwUpdateManager() {
  // Use ref to store the instance for cleanup
  const serwistRef = useRef<Serwist | undefined>(undefined);

  useEffect(() => {
    let unmount = false;

    let waitingHandler: (() => void) | undefined;
    let controllingHandler: (() => void) | undefined;

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
              serwist.messageSkipWaiting();
            },
          },
          duration: Infinity,
        });
      };

      controllingHandler = () => {
        window.location.reload();
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
