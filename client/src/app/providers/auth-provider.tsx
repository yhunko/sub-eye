import { useState, useEffect, PropsWithChildren } from "react";
import { ClerkProvider, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { SplashScreen } from "@/shared/ui";
import { getLocale } from "@/i18n/runtime";
import { useMounted } from "@mantine/hooks";
import type { LocalizationResource } from "@clerk/types";

const clerkLocalizationMapper = {
  en: () => import("@clerk/localizations").then((m) => m.enUS),
  uk: () => import("@clerk/localizations").then((m) => m.ukUA),
};

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: PropsWithChildren) {
  const isMounted = useMounted();
  const [localization, setLocalization] = useState<
    LocalizationResource | undefined
  >(undefined);
  const locale = getLocale() as keyof typeof clerkLocalizationMapper;

  useEffect(() => {
    const loadLocalization = async () => {
      const loader =
        clerkLocalizationMapper[locale] || clerkLocalizationMapper.en;
      const data = await loader();

      if (isMounted) {
        setLocalization(data);
      }
    };

    void loadLocalization();
  }, [isMounted, locale]);

  if (!publishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
  }

  if (!localization) {
    return <SplashScreen />;
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
      <ClerkLoading>
        <SplashScreen />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProvider>
  );
}
