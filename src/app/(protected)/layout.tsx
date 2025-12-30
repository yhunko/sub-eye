import { ClerkProvider } from "@/shared/lib/clerk";
import { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
