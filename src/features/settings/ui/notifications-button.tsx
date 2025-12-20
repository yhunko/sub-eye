"use client";

import { Label, Switch } from "@/shared/components";
import {
  usePushNotificationsSubscription,
  useSubscribeToPushNotifications,
  useUnsubscribeFromPushNotifications,
} from "@/entities/push-notifications/api/hooks";

export const NotificationsButton = () => {
  const { data: subscription } = usePushNotificationsSubscription();
  const { mutate: subscribeToNotifications, isPending: isSubscribing } =
    useSubscribeToPushNotifications();
  const { mutate: unsubscribeFromNotifications, isPending: isUnsubscribing } =
    useUnsubscribeFromPushNotifications();

  const handleToggleNotifications = () => {
    if (subscription) {
      unsubscribeFromNotifications();
    } else {
      subscribeToNotifications();
    }
  };

  return (
    <div className="bg-card flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label
          htmlFor="notification-toggle"
          className="cursor-pointer text-base"
        >
          Enable Notifications
        </Label>
        <p className="text-muted-foreground text-sm">
          Receive push notifications about important updates
        </p>
      </div>
      <Switch
        id="notification-toggle"
        checked={!!subscription}
        onCheckedChange={handleToggleNotifications}
        disabled={isSubscribing || isUnsubscribing}
      />
    </div>
  );
};
