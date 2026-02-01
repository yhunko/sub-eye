import type { PropsWithChildren } from "react";
import { ClerkProvider, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { SplashScreen } from "@/shared/ui";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: PropsWithChildren) {
  if (!publishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/auth/sign-in"
      signUpUrl="/auth/sign-up"
      appearance={{
        theme: shadcn,
      }}
    >
      <ClerkLoading>
        <SplashScreen />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProvider>
  );
}
