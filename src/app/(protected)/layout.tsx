import { PropsWithChildren } from "react";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { AppLoading } from "@/shared/components";

export default async function ProtectedClerkPages({
  children,
}: Readonly<PropsWithChildren>) {
  return (
    <>
      <ClerkLoading>
        <AppLoading />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </>
  );
}
