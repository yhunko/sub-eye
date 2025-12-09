import { SettingsTab } from "../model/props";
import { FC, PropsWithChildren } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import Link from "next/link";

export type SettingsLayoutProps = {
  tab: SettingsTab;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  tab,
  children,
}) => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="w-full max-w-xl space-y-4">
        <Tabs defaultValue={tab}>
          <TabsList className="w-full">
            <TabsTrigger value={SettingsTab.GENERAL} asChild>
              <Link href="/settings/general">General</Link>
            </TabsTrigger>
            <TabsTrigger value={SettingsTab.ACCOUNT} asChild>
              <Link href="/settings/account">Account</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  );
};
