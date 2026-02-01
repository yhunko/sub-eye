import { useAuth } from "@clerk/clerk-react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/routes/routeTree.gen";
import { queryClient, ReactQueryProvider } from "./app/providers/react-query";
import { Toaster } from "@/shared/components";

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const auth = useAuth();

  return (
    <ReactQueryProvider>
      <RouterProvider router={router} context={{ auth, queryClient }} />
      <Toaster richColors />
    </ReactQueryProvider>
  );
}
