"use client";

import {
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
import { useTranslations } from "next-intl";

export const NotificationsButton = () => {
  const t = useTranslations("settings.notifications");
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
        <ItemTitle>{t("title")}</ItemTitle>
        <ItemDescription>{t("description")}</ItemDescription>
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
};
