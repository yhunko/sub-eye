import { useAuth } from "@clerk/clerk-react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/routes/routeTree.gen";
import { queryClient } from "./app/providers/react-query";
import { Toaster } from "@/shared/components";
import { useMemo } from "react";

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
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const auth = useAuth();

  const routerContext = useMemo(
    () => ({
      auth,
      queryClient,
    }),
    [auth],
  );

  return (
    <>
      <RouterProvider router={router} context={routerContext} />
      <Toaster richColors />
    </>
  );
}
