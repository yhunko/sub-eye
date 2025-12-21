"use client";

import { FC } from "react";
import { useOs } from "@mantine/hooks";
import { Share, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components";
import { useApplePushNotificationsSupport } from "../hooks/use-apple-push-notifications-support";

export const AppleInstallPrompt: FC = () => {
  const isApplePushSupported = useApplePushNotificationsSupport();
  const os = useOs();

  const isIOS = os === "ios";

  if (!isIOS || isApplePushSupported) {
    return null;
  }

  return (
    <Alert className="relative border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <AlertTitle className="mb-2 text-blue-900 dark:text-blue-100">
        Install App for Notifications
      </AlertTitle>
      <AlertDescription className="space-y-3 text-blue-800 dark:text-blue-200">
        <p>
          To enable push notifications on iOS, you need to install this app to
          your Home Screen.
        </p>
        <div className="space-y-2 rounded-md bg-white/60 p-3 dark:bg-blue-900/30">
          <p className="font-medium">How to install:</p>
          <ol className="ml-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                Tap the <Share className="mx-1 inline-block h-4 w-4" /> Share
                button (usually at the bottom or top of Safari)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Scroll down and tap{" "}
                <Plus className="mx-1 inline-block h-4 w-4" />
                &#34;Add to Home Screen&#34;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>Tap &#34;Add&#34; in the top right corner</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>Open the app from your Home Screen</span>
            </li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  );
};
