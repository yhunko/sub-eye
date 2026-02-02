import { FC, PropsWithChildren } from "react";

export const SettingsFormLayout: FC<PropsWithChildren> = ({ children }) => {
  return <div className="flex h-full w-full justify-center">{children}</div>;
};
