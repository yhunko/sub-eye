import { FC, PropsWithChildren } from "react";

export const SettingsFormLayout: FC<PropsWithChildren> = ({ children }) => {
  return <div className="w-full">{children}</div>;
};
