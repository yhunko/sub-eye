import { ClerkProvider } from "@clerk/clerk-react";
import { enUS, ukUA } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";
import type { PropsWithChildren } from "react";
import { getLocale } from "@/i18n/runtime";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const localesMap = {
  en: enUS,
  uk: ukUA,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const localization = localesMap[getLocale()];

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
      localization={localization}
    >
      {children}
    </ClerkProvider>
  );
}
