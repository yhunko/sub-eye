const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export const isLocalDevRuntime = (): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return LOOPBACK_HOSTNAMES.has(window.location.hostname);
};

export const isLocalPlanSwitcherEnabled = (): boolean => {
  if (!isLocalDevRuntime()) {
    return false;
  }

  const flag = import.meta.env.VITE_LOCAL_PLAN_SWITCHER;
  return typeof flag === "string" && flag.trim().length > 0;
};
