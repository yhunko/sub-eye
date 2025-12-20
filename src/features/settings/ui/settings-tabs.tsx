"use client";

import { FC } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components";
import Link from "next/link";
import { SettingsTab } from "../model/props";

type SettingsTabsProps = {
  tab: SettingsTab;
};

export const SettingsTabs: FC<SettingsTabsProps> = ({ tab }) => {
  return (
    <Tabs defaultValue={tab}>
      <TabsList className="w-full">
        <TabsTrigger value={SettingsTab.GENERAL} asChild>
          <Link href="/settings/general">General</Link>
        </TabsTrigger>
        <TabsTrigger value={SettingsTab.NOTIFICATIONS} asChild>
          <Link href="/settings/notifications">Notifications</Link>
        </TabsTrigger>
        <TabsTrigger value={SettingsTab.ACCOUNT} asChild>
          <Link href="/settings/account">Account</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
