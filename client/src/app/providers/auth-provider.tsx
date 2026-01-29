import type { PropsWithChildren } from "react";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/clerk-react";
import { SplashScreen } from "@/shared/ui/splash-screen";

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
    >
      <ClerkLoading>
        <SplashScreen />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProvider>
  );
}
