import type { FC, PropsWithChildren } from "react";

export const SettingsFormLayout: FC<PropsWithChildren> = ({ children }) => {
  return <div className="space-y-4">{children}</div>;
};
