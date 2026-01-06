"use client";

import { FC } from "react";
import { Tabs, TabsList } from "@/shared/components";
import Link from "next/link";
import { SettingsTab } from "../model/props";
import { useTranslations } from "next-intl";

type SettingsTabsProps = {
  tab: SettingsTab;
  className?: string;
};

export const SettingsTabs: FC<SettingsTabsProps> = ({ tab, className }) => {
  const t = useTranslations("settings.tabs");

  return (
    <Tabs defaultValue={tab} className={className}>
      <TabsList className="w-full">
        <Link href="/settings/general">{t("general")}</Link>
        <Link href="/settings/notifications">{t("notifications")}</Link>
        <Link href="/settings/account">{t("account")}</Link>
      </TabsList>
    </Tabs>
  );
};
