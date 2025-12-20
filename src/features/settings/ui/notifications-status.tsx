"use client";

import { Bell, BellOff, CheckCircle2, XCircle } from "lucide-react";
import { Spinner, Badge } from "@/shared/components";
import { useEffect, useState } from "react";
import { usePushNotificationsSubscription } from "@/entities/push-notifications/api/hooks";

export const NotificationsStatus = () => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const { data: subscription, isLoading } = usePushNotificationsSubscription();

  const isSubscribed = !!subscription;

  const getBrowserIcon = () => {
    if (isSupported === null) return <Spinner />;
    if (isSupported) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
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

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      // Official Next.js example: https://nextjs.org/docs/app/guides/progressive-web-apps#2-implementing-web-push-notifications
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(true);
    }
  }, []);

  return (
    <div className="bg-muted/30 flex items-center gap-4 rounded-lg border p-3 text-sm">
      <Badge variant="outline">
        {getBrowserIcon()}

        {getBrowserSupportLabel()}
      </Badge>
      <Badge variant="outline">
        {getSubscriptionIcon()}

        {subscriptionLabel()}
      </Badge>
    </div>
  );
};
