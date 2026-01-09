"use client";

import { ClerkProvider as Provider } from "@clerk/nextjs";
import { FC, PropsWithChildren } from "react";
import { shadcn } from "@clerk/themes";
import { LocalizationResource } from "@clerk/types";

type ClerkProviderProps = {
  localization: LocalizationResource;
};

export const ConfiguredClerkProvider: FC<
  PropsWithChildren<ClerkProviderProps>
> = ({ localization, children }) => {
  return (
    <Provider
      appearance={{
        theme: shadcn,
      }}
      signInFallbackRedirectUrl="/"
      afterSignOutUrl="/auth/sign-in"
      localization={localization}
    >
      {children}
    </Provider>
  );
};
