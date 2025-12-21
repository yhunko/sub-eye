"use client";

import {
  Label,
  Switch,
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/shared/components";
import {
  usePushNotificationsSubscription,
  useSubscribeToPushNotifications,
  useUnsubscribeFromPushNotifications,
} from "@/entities/push-notifications/api/hooks";
import { usePushNotificationsSupport } from "../hooks/use-push-notifications-support";

export const NotificationsButton = () => {
  const isSupported = usePushNotificationsSupport();

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

  const isDisabled = isSubscribing || isUnsubscribing || !isSupported;

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Enable Notifications</ItemTitle>
        <ItemDescription>
          Receive push notifications about important updates
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          id="notification-toggle"
          checked={!!subscription}
          onCheckedChange={handleToggleNotifications}
          disabled={isDisabled}
        />
      </ItemActions>
    </Item>
  );

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
        disabled={isDisabled}
      />
    </div>
  );
};
