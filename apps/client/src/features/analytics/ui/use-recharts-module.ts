import { useEffect, useState } from "react";

type RechartsModule = typeof import("recharts");

let rechartsModulePromise: Promise<RechartsModule> | null = null;

function loadRechartsModule() {
  if (!rechartsModulePromise) {
    rechartsModulePromise = import("recharts");
  }

  return rechartsModulePromise;
}

export function useRechartsModule() {
  const [rechartsModule, setRechartsModule] = useState<RechartsModule | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;

    loadRechartsModule().then((module) => {
      if (!isCancelled) {
        setRechartsModule(module);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return rechartsModule;
}
