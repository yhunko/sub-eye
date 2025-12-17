import { FC, PropsWithChildren, ReactNode } from "react";

export type SettingsLayoutProps = {
  Tabs: ReactNode;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  Tabs,
  children,
}) => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="w-full max-w-xl space-y-4">
        {Tabs}

        {children}
      </div>
    </div>
  );
};
