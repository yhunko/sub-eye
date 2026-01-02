import { FC, PropsWithChildren, ReactNode } from "react";
import { cn } from "@/shared/lib";

export type SettingsLayoutProps = {
  Tabs: ReactNode;
  className?: string;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  Tabs,
  className,
  children,
}) => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className={cn("w-full max-w-xl space-y-4", className)}>
        {Tabs}

        {children}
      </div>
    </div>
  );
};
