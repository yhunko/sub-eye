import { useAuth } from "@clerk/clerk-react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./app/router";
import { queryClient } from "./app/providers/react-query";
import { Toaster } from "@/shared/components";
import { Suspense, lazy, useMemo, useState, useEffect } from "react";
import { useIsRestoring } from "@tanstack/react-query";
import { SplashScreen } from "./shared/ui";
import { SwUpdateManager } from "./features/pwa/sw-update-manager";
import { isLocalPlanSwitcherEnabled } from "./shared/lib/env/local-dev-runtime";

const DevPlanSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import("./features/dev-plan-switcher").then((module) => ({
        default: module.DevPlanSwitcher,
      })),
    )
  : null;

export function App() {
  const auth = useAuth();
  const isRestoring = useIsRestoring();
  const shouldLoadDevPlanSwitcher =
    DevPlanSwitcher && isLocalPlanSwitcherEnabled();
  const [routerReady, setRouterReady] = useState(false);

  useEffect(() => {
    return router.subscribe("onResolved", () => {
      setRouterReady(true);
    });
  }, []);

  const routerContext = useMemo(
    () => ({
      auth,
      queryClient,
    }),
    [auth],
  );

  if (!auth.isLoaded || isRestoring) {
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
