import { FC, PropsWithChildren } from "react";

export const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="grow flex items-center justify-center">{children}</main>
  );
};
