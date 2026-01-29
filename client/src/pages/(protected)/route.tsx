import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { SplashScreen } from "@/shared/ui/splash-screen";

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

  return <Outlet />;
}
