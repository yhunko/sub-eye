import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { posthog } from "@/shared/lib/analytics";
import { RootErrorFallback } from "@/shared/ui";
import { routeTree } from "./routes/routeTree.gen";

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient: undefined! as QueryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 1000,
  defaultErrorComponent: RootErrorFallback,
});

router.subscribe("onResolved", () => {
  posthog.capture("$pageview");
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
