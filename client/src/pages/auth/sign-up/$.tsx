import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { AuthLayout } from "@/widgets/auth-layout";
import { authRedirectSearchSchema } from "@/shared/lib/router/auth-redirect-search";

export const Route = createFileRoute("/auth/sign-up/$")({
  validateSearch: valibotValidator(authRedirectSearchSchema),
  component: SignUpPage,
});

function SignUpPage() {
  const { redirect, redirect_url } = Route.useSearch();
  const forceRedirectUrl = redirect_url ?? redirect;

  return (
    <AuthLayout>
      <SignUp
        routing="path"
        path="/auth/sign-up"
        signInUrl="/auth/sign-in"
        forceRedirectUrl={forceRedirectUrl}
        signInForceRedirectUrl={forceRedirectUrl}
      />
    </AuthLayout>
  );
}
