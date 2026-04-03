import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { authRedirectSearchSchema } from "@/shared/lib/router/auth-redirect-search";
import { AuthLayout } from "@/widgets/auth-layout";

export const Route = createFileRoute("/auth/sign-in/$")({
  validateSearch: valibotValidator(authRedirectSearchSchema),
  component: SignInPage,
});

function SignInPage() {
  const { redirect, redirect_url } = Route.useSearch();
  const forceRedirectUrl = redirect_url ?? redirect;

  return (
    <AuthLayout>
      <SignIn
        routing="path"
        path="/auth/sign-in"
        signUpUrl="/auth/sign-up"
        forceRedirectUrl={forceRedirectUrl}
        signUpForceRedirectUrl={forceRedirectUrl}
      />
    </AuthLayout>
  );
}
