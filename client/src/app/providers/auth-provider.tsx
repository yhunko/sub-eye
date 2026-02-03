import { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { getLocale } from "@/i18n/runtime";
import { enUS, ukUA } from "@clerk/localizations";

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
