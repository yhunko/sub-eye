import { ClerkProvider } from "@/shared/lib/clerk";
import { ReactNode } from "react";
import { routing } from "@/features/i18n/lib/routing";
import { LocalizationResource } from "@clerk/types";

const localizationMapper: Record<string, () => Promise<LocalizationResource>> =
  {
    en: () => import("@clerk/localizations").then((m) => m.enUS),
    ua: () => import("@clerk/localizations").then((m) => m.ukUA),
  };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ProtectedLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const clerkLocalizationLoader = localizationMapper[locale];
  const localization = await clerkLocalizationLoader();

  return <ClerkProvider localization={localization}>{children}</ClerkProvider>;
}
