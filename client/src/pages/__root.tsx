import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { SplashScreen } from "@/shared/ui/splash-screen";
import type { useAuth } from "@clerk/clerk-react";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  pendingComponent: () => <SplashScreen />,
  component: () => (
    <>
      <Outlet />

      <TanStackRouterDevtools />
    </>
  ),
});
