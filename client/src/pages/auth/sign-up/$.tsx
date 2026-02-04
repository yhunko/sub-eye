import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { AuthLayout } from "@/widgets/auth-layout";

export const Route = createFileRoute("/auth/sign-up/$")({
  component: () => (
    <AuthLayout>
      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </AuthLayout>
  ),
});
