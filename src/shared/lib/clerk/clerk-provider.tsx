import { ClerkProvider as Provider } from "@clerk/nextjs";
import { FC, PropsWithChildren } from "react";
import { shadcn } from "@clerk/themes";

export const ClerkProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider
      appearance={{
        theme: shadcn,
      }}
      signInFallbackRedirectUrl="/"
      afterSignOutUrl="/auth/sign-in"
    >
      {children}
    </Provider>
  );
};
