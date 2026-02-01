import { useAuth } from "@clerk/clerk-react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/routes/routeTree.gen";
import { ThemeProvider } from "./app/providers/theme-provider";
import { queryClient } from "./app/providers/react-query";

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreload: "intent",
  // This prevents the "flash" of the splash screen for fast users.
  defaultPendingMs: 150,
  defaultPendingMinMs: 500, // If splash shows, keep it for 500ms so it's not jarring
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const auth = useAuth();

  return (
    <ThemeProvider>
      <RouterProvider router={router} context={{ auth, queryClient }} />
    </ThemeProvider>
  );
}
