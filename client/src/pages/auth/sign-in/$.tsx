import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { AuthLayout } from "@/widgets/auth-layout";

export const Route = createFileRoute("/auth/sign-in/$")({
  component: () => (
    <AuthLayout>
      <SignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    </AuthLayout>
  ),
});
