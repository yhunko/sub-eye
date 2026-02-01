import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ReactQueryProvider } from "../../app/providers/react-query";
import { Toaster } from "@/shared/components";

export const Route = createFileRoute("/(protected)")({
  beforeLoad: ({ context }) => {
    // If auth isn't loaded, we can throw a promise or handle it via context
    // But a cleaner way is to check the status here:
    if (context.auth.isLoaded && !context.auth.userId) {
      throw redirect({
        to: "/auth/sign-in",
        replace: true,
      });
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { auth } = Route.useRouteContext();

  if (!auth.isLoaded) return null;

  return (
    <ReactQueryProvider>
      <Outlet />

      <Toaster richColors />
    </ReactQueryProvider>
  );
}
