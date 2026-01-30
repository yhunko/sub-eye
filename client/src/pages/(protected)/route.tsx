import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { SplashScreen } from "@/shared/ui/splash-screen";
import { ReactQueryProvider } from "../../app/providers/react-query-provider";
import { Toaster } from "@/shared/components";

export const Route = createFileRoute("/(protected)")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  if (!userId) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <ReactQueryProvider>
      <Outlet />

      <Toaster richColors />
    </ReactQueryProvider>
  );
}
