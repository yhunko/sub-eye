import { ClerkProvider as Provider } from "@clerk/nextjs";
import { FC, PropsWithChildren } from "react";

export const ClerkProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider signInFallbackRedirectUrl="/" afterSignOutUrl="/auth/sign-in">
      {children}
    </Provider>
  );
};
