"use client";

import { Bell, BellOff, CheckCircle2, XCircle } from "lucide-react";
import { Spinner, Badge } from "@/shared/components";
import { usePushNotificationsSubscription } from "@/entities/push-notifications/api/hooks";
import { usePushNotificationsSupport } from "../hooks/use-push-notifications-support";
import { useApplePushNotificationsSupport } from "../hooks/use-apple-push-notifications-support";
import { AppleInstallPrompt } from "./apple-install-prompt";

export const NotificationsStatus = () => {
  const isAppleSupported = useApplePushNotificationsSupport();
  const isSupported = usePushNotificationsSupport();
  const { data: subscription, isLoading } = usePushNotificationsSubscription();

  const isSubscribed = !!subscription;

  const getBrowserIcon = () => {
    if (isSupported === null) return <Spinner />;
    if (isSupported || isAppleSupported)
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <XCircle className="text-destructive h-4 w-4" />;
  };

  const getSubscriptionIcon = () => {
    if (isLoading) return <Spinner />;
    if (isSubscribed) return <Bell className="h-4 w-4 text-green-600" />;
    return <BellOff className="text-muted-foreground h-4 w-4" />;
  };

  const getBrowserSupportLabel = () => {
    if (isSupported === null) return "Checking...";
    return isSupported ? "Supported" : "Not supported";
  };

  const subscriptionLabel = () => {
    if (isLoading) return "Checking...";
    return isSubscribed ? "Subscribed" : "Not subscribed";
  };

  return (
    <div className="bg-muted/30 rounded-lg border p-3 text-sm">
      <div className="space-y-2 md:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Badge variant="outline">
            {getBrowserIcon()}

            {getBrowserSupportLabel()}
          </Badge>
          <Badge variant="outline">
            {getSubscriptionIcon()}

            {subscriptionLabel()}
          </Badge>
        </div>

        <AppleInstallPrompt />
      </div>
    </div>
  );
};
