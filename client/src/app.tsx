import { useAuth } from "@clerk/clerk-react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/routes/routeTree.gen";
import { queryClient } from "./app/providers/react-query";
import { Toaster } from "@/shared/components";
import { Suspense, lazy, useMemo } from "react";
import { useIsRestoring } from "@tanstack/react-query";
import { RootErrorFallback, SplashScreen } from "./shared/ui";
import { SwUpdateManager } from "./features/pwa/sw-update-manager";
import { isLocalPlanSwitcherEnabled } from "./shared/lib/env/local-dev-runtime";
import { track } from "./shared/lib/analytics";

const DevPlanSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import("./features/dev-plan-switcher").then((module) => ({
        default: module.DevPlanSwitcher,
      })),
    )
  : null;

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 1000,
  defaultErrorComponent: RootErrorFallback,
});

router.subscribe("onResolved", ({ toLocation }) => {
  track("page_viewed", { path: toLocation.pathname });
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const auth = useAuth();
  const isRestoring = useIsRestoring();
  const shouldLoadDevPlanSwitcher =
    DevPlanSwitcher && isLocalPlanSwitcherEnabled();

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
      <SwUpdateManager />
      <Toaster position="top-center" richColors />
      {shouldLoadDevPlanSwitcher ? (
        <Suspense fallback={null}>
          <DevPlanSwitcher />
        </Suspense>
      ) : null}
    </>
  );
}
