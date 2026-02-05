import { Bell, BellOff, CheckCircle2, XCircle } from "lucide-react";
import { Badge, Spinner } from "@/shared/components";
import { usePushNotificationsSubscription } from "../api/hooks";
import { usePushNotificationsSupport } from "../model/use-push-notifications-support";
import { useApplePushNotificationsSupport } from "../model/use-apple-push-notifications-support";
import { AppleInstallPrompt } from "./apple-install-prompt";
import * as m from "@/shared/lib/i18n/messages";

export const NotificationsStatus = () => {
  const isAppleSupported = useApplePushNotificationsSupport();
  const isSupported = usePushNotificationsSupport();
  const { data: subscription, isLoading } = usePushNotificationsSubscription();

  const isSubscribed = !!subscription;

  const getBrowserIcon = () => {
    if (isSupported === null) return <Spinner className="h-4 w-4" />;
    if (isSupported || isAppleSupported)
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <XCircle className="text-destructive h-4 w-4" />;
  };

  const getSubscriptionIcon = () => {
    if (isLoading) return <Spinner className="h-4 w-4" />;
    if (isSubscribed) return <Bell className="h-4 w-4 text-green-600" />;
    return <BellOff className="text-muted-foreground h-4 w-4" />;
  };

  const getBrowserSupportLabel = () => {
    if (isSupported === null) return m.settings_notifications_status_checking();
    return isSupported || isAppleSupported
      ? m.settings_notifications_status_supported()
      : m.settings_notifications_status_notSupported();
  };

  const subscriptionLabel = () => {
    if (isLoading) return m.settings_notifications_status_checking();
    return isSubscribed
      ? m.settings_notifications_status_subscribed()
      : m.settings_notifications_status_notSubscribed();
  };

  return (
    <div className="bg-muted/30 rounded-lg border p-3 text-sm">
      <div className="space-y-2 md:space-y-4">
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="gap-2">
            {getBrowserIcon()}
            {getBrowserSupportLabel()}
          </Badge>
          <Badge variant="outline" className="gap-2">
            {getSubscriptionIcon()}
            {subscriptionLabel()}
          </Badge>
        </div>

        <AppleInstallPrompt />
      </div>
    </div>
  );
};
