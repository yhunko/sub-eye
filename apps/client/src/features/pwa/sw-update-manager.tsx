import { getSerwist } from "virtual:serwist";
import { useEffect } from "react";

export function SwUpdateManager() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unmounted = false;

    const init = async () => {
      if (!("serviceWorker" in navigator)) return;

      const serwist = await getSerwist();
      if (unmounted || !serwist) return;

      const onControlling = () => window.location.reload();
      serwist.addEventListener("controlling", onControlling);
      cleanup = () => serwist.removeEventListener("controlling", onControlling);

      void serwist.register();
    };

    void init();

    return () => {
      unmounted = true;
      cleanup?.();
    };
  }, []);

  return null;
}
