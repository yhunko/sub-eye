"use client";

import { useOs } from "@mantine/hooks";
import { Plus, Share } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components";
import * as m from "@/shared/lib/i18n/messages";
import { useApplePushNotificationsSupport } from "../model/use-apple-push-notifications-support";

export const AppleInstallPrompt = () => {
  const isApplePushSupported = useApplePushNotificationsSupport();
  const os = useOs();
  const isIOS = os === "ios";

  if (!isIOS || isApplePushSupported) {
    return null;
  }

  return (
    <Alert className="relative border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <AlertTitle className="mb-2 text-blue-900 dark:text-blue-100">
        {m.settings_notifications_appleInstall_title()}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-blue-800 dark:text-blue-200">
        <p>{m.settings_notifications_appleInstall_description()}</p>
        <div className="space-y-2 rounded-md bg-white/60 p-3 dark:bg-blue-900/30">
          <p className="font-medium">
            {m.settings_notifications_appleInstall_howToInstall()}
          </p>
          <ol className="ml-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                {m.settings_notifications_appleInstall_step1()}
                <Share className="mx-1 inline-block h-4 w-4" />
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                {m.settings_notifications_appleInstall_step2()}
                <Plus className="mx-1 inline-block h-4 w-4" />
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>{m.settings_notifications_appleInstall_step3()}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>{m.settings_notifications_appleInstall_step4()}</span>
            </li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  );
};
