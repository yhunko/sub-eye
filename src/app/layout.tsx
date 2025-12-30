import { ReactNode } from "react";
import type { Metadata } from "next";
import { Sono } from "next/font/google";
import { ClerkProvider } from "@/shared/lib/clerk";
import { ReactQueryProvider } from "@/shared/lib/react-query";
import { Toaster } from "@/shared/components";
import { ThemeProvider } from "@/features/theme";
import { SerwistProvider } from "@/shared/lib/serwist/provider";
import { cn } from "@/shared/lib";

import "./globals.css";

const sono = Sono({
  variable: "--font-sono",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            sono.variable,
            "flex min-h-screen flex-col antialiased",
          )}
        >
          <ReactQueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SerwistProvider>{children}</SerwistProvider>
            </ThemeProvider>

            <Toaster />
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
