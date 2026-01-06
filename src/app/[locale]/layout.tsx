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

import "../globals.css";
import { setRequestLocale } from "next-intl/server";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubEye",
  description: "Minimalist subscriptions tracker app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
                {children}
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
