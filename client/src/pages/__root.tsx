import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { SplashScreen } from "@/shared/ui/splash-screen";
import type { useAuth } from "@clerk/clerk-react";
import { QueryClient } from "@tanstack/react-query";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
  queryClient: QueryClient;
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
