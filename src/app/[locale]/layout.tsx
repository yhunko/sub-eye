import { ReactNode } from "react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ReactQueryProvider } from "@/shared/lib/react-query";
import { Toaster } from "@/shared/components";
import { ThemeProvider } from "@/features/theme";
import { SerwistProvider } from "@/shared/lib/serwist/provider";
import { cn } from "@/shared/lib";
import { SwUpdateManager } from "@/shared/lib/serwist/sw-update-manager";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LocalizationResource } from "@clerk/types";
import { ConfiguredClerkProvider } from "@/shared/lib/clerk";

import "../globals.css";

const clerkLocalizationMapper: Record<
  string,
  () => Promise<LocalizationResource>
> = {
  en: () => import("@clerk/localizations").then((m) => m.enUS),
  ua: () => import("@clerk/localizations").then((m) => m.ukUA),
};

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubEye",
  description: "Minimalist subscriptions tracker app",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "SubEye",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const clerkLocalizationLoader = clerkLocalizationMapper[locale];
  const localization = await clerkLocalizationLoader();

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          nunito.variable,
          "flex min-h-screen flex-col antialiased",
        )}
      >
        <NextIntlClientProvider locale={locale}>
          <SerwistProvider>
            <ReactQueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <ConfiguredClerkProvider localization={localization}>
                  {children}
                </ConfiguredClerkProvider>
              </ThemeProvider>

              <Toaster position="top-right" richColors />
              <SwUpdateManager />
            </ReactQueryProvider>
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
