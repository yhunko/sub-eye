import type { useAuth } from "@clerk/clerk-react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy } from "react";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
  queryClient: QueryClient;
};

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : () => null;

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />

      <TanStackRouterDevtools />
    </>
  ),
});
