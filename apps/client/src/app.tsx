import { useAuth, useUser } from "@clerk/clerk-react";
import { useIsRestoring } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/shared/components";
import { queryClient } from "./app/providers/react-query/client";
import { router } from "./app/router";
import { SwUpdateManager } from "./features/pwa/sw-update-manager";
import { isLocalPlanSwitcherEnabled } from "./shared/lib/env/local-dev-runtime";
import { SplashScreen } from "./shared/ui/splash-screen";

const DevPlanSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import("./features/dev-plan-switcher").then((module) => ({
        default: module.DevPlanSwitcher,
      })),
    )
  : null;

export function App() {
  const auth = useAuth();
  const { isLoaded: isUserLoaded } = useUser();
  const isRestoring = useIsRestoring();
  const [timedOut, setTimedOut] = useState(false);
  const shouldLoadDevPlanSwitcher =
    DevPlanSwitcher && isLocalPlanSwitcherEnabled();
  const [routerReady, setRouterReady] = useState(false);

  useEffect(() => {
    return router.subscribe("onResolved", () => {
      setRouterReady(true);
    });
  }, []);

  useEffect(() => {
    if (auth.isLoaded && isUserLoaded && !isRestoring) return;
    const id = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(id);
  }, [auth.isLoaded, isUserLoaded, isRestoring]);

  const routerContext = useMemo(
    () => ({
      auth,
      queryClient,
    }),
    [auth],
  );

  if ((!auth.isLoaded || !isUserLoaded || isRestoring) && !timedOut) {
    return <SplashScreen />;
  }

  return (
    <>
      <RouterProvider router={router} context={routerContext} />
      {routerReady && <SwUpdateManager />}
      <Toaster position="top-center" richColors />
      {shouldLoadDevPlanSwitcher ? (
        <Suspense fallback={null}>
          <DevPlanSwitcher />
        </Suspense>
      ) : null}
    </>
  );
}
