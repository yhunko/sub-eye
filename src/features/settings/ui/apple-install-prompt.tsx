"use client";

import { FC } from "react";
import { useOs } from "@mantine/hooks";
import { Share, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components";
import { useApplePushNotificationsSupport } from "../hooks/use-apple-push-notifications-support";
import { useTranslations } from "next-intl";

export const AppleInstallPrompt: FC = () => {
  const isApplePushSupported = useApplePushNotificationsSupport();
  const os = useOs();
  const t = useTranslations("settings.notifications.appleInstall");

  const isIOS = os === "ios";

  if (!isIOS || isApplePushSupported) {
    return null;
  }

  return (
    <Alert className="relative border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <AlertTitle className="mb-2 text-blue-900 dark:text-blue-100">
        {t("title")}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-blue-800 dark:text-blue-200">
        <p>{t("description")}</p>
        <div className="space-y-2 rounded-md bg-white/60 p-3 dark:bg-blue-900/30">
          <p className="font-medium">{t("howToInstall")}</p>
          <ol className="ml-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                {t("step1")}
                <Share className="mx-1 inline-block h-4 w-4" />
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                {t("step2")}
                <Plus className="mx-1 inline-block h-4 w-4" />
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>{t("step3")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>{t("step4")}</span>
            </li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  );
};
