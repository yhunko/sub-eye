import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { useAuth } from "@clerk/clerk-react";
import { QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "../app/providers/theme-provider";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>

      <TanStackRouterDevtools />
    </>
  ),
});
