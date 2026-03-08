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
} from "../api/hooks";
import { usePushNotificationsSupport } from "../model/use-push-notifications-support";
import * as m from "@/shared/lib/i18n/messages";

export const NotificationsButton = () => {
  const isSupported = usePushNotificationsSupport();
  const { data: subscription } = usePushNotificationsSubscription();
  const { mutate: subscribe, isPending: isSubscribing } =
    useSubscribeToPushNotifications();
  const { mutate: unsubscribe, isPending: isUnsubscribing } =
    useUnsubscribeFromPushNotifications();

  const isSubscribed = !!subscription;

  const handleToggleNotifications = (nextChecked: boolean) => {
    if (nextChecked) {
      subscribe();
    } else {
      unsubscribe();
    }
  };

  const isDisabled = isSubscribing || isUnsubscribing || !isSupported;

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{m.settings_notifications_title()}</ItemTitle>
        <ItemDescription>
          {m.settings_notifications_description()}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          id="notification-toggle"
          checked={isSubscribed}
          onCheckedChange={handleToggleNotifications}
          disabled={isDisabled}
          aria-label={
            isSubscribed
              ? `${m.settings_notifications_title()} - ${m.settings_notifications_description()}, currently enabled`
              : `${m.settings_notifications_title()} - ${m.settings_notifications_description()}, currently disabled`
          }
        />
      </ItemActions>
    </Item>
  );
};
