import { FC, PropsWithChildren } from "react";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { AppLoading } from "@/shared/components";

export const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex grow items-center justify-center">
      <ClerkLoading>
        <AppLoading />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </main>
  );
};
