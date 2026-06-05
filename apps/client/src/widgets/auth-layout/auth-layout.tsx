import type { FC, PropsWithChildren } from "react";

export const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex h-svh items-center justify-center">{children}</main>
  );
};
