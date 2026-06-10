import { useUser } from "@clerk/clerk-react";
import {
  DEFAULT_EXPIRY_NOTIFICATION_INTERVALS,
  EXPIRY_NOTIFICATION_INTERVAL_OPTIONS,
} from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import { useUpdateUserMetadata } from "@/entities/user";
import * as m from "@/i18n/messages";
import {
  Checkbox,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  Label,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { LoadingSwitch } from "./loading-switch";

const getIntervalLabel = (
  interval: (typeof EXPIRY_NOTIFICATION_INTERVAL_OPTIONS)[number],
) => {
  switch (interval) {
    case 14:
      return m.settings_notifications_expiry_interval_14days();
    case 7:
      return m.settings_notifications_expiry_interval_7days();
    case 3:
      return m.settings_notifications_expiry_interval_3days();
    case 1:
      return m.settings_notifications_expiry_interval_1day();
    default:
      return `${interval}`;
  }
};

export const ExpiryNotificationsCard = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();
  const userId = user?.id;
  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId! },
      options: { enabled: Boolean(userId) },
    }),
  );

  const canUseExpiryNotifications =
    usage?.features.expiryNotifications === true;
  const expiryEnabled =
    user?.publicMetadata?.expiryNotificationsEnabled === true;
  const selectedIntervalsRaw =
    user?.publicMetadata?.expiryNotificationIntervals;
  const selectedIntervals =
    Array.isArray(selectedIntervalsRaw) &&
    selectedIntervalsRaw.every((value) => typeof value === "number")
      ? selectedIntervalsRaw
      : DEFAULT_EXPIRY_NOTIFICATION_INTERVALS;

  const handleToggle = (nextEnabled: boolean) => {
    if (!canUseExpiryNotifications) {
      return;
    }
    mutate({ expiryNotificationsEnabled: nextEnabled });
  };

  const handleIntervalToggle = (
    interval: (typeof EXPIRY_NOTIFICATION_INTERVAL_OPTIONS)[number],
  ) => {
    if (!canUseExpiryNotifications || !expiryEnabled) {
      return;
    }

    const nextIntervals = selectedIntervals.includes(interval)
      ? selectedIntervals.filter((value) => value !== interval)
      : [...selectedIntervals, interval];
    const normalizedIntervals =
      nextIntervals.length > 0
        ? nextIntervals
        : [...DEFAULT_EXPIRY_NOTIFICATION_INTERVALS];

    mutate({
      expiryNotificationIntervals: normalizedIntervals.sort((a, b) => b - a),
    });
  };

  return (
    <div className="space-y-3">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{m.settings_notifications_expiry_title()}</ItemTitle>
          <ItemDescription>
            {m.settings_notifications_expiry_description()}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <LoadingSwitch
            id="expiry-notifications-toggle"
            checked={expiryEnabled}
            disabled={!canUseExpiryNotifications || !isLoaded || isPending}
            isLoading={isPending}
            onCheckedChange={handleToggle}
            aria-label={m.settings_notifications_expiry_toggle_label()}
          />
        </ItemActions>
      </Item>

      {!canUseExpiryNotifications && (
        <PlanFeatureLockCard
          title={m.settings_notifications_expiry_lockTitle()}
          description={m.settings_notifications_expiry_lockDescription()}
          analyticsSource="expiry_notifications"
        />
      )}

      {canUseExpiryNotifications && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            {m.settings_notifications_expiry_intervals_label()}
          </p>
          <div
            className={cn(
              "grid grid-cols-2 gap-2 transition-opacity",
              !expiryEnabled && "opacity-50",
            )}
          >
            {EXPIRY_NOTIFICATION_INTERVAL_OPTIONS.map((interval) => {
              const checkboxId = `expiry-notification-${interval}`;
              return (
                <Item
                  key={interval}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selectedIntervals.includes(interval)}
                    disabled={!expiryEnabled || isPending}
                    onCheckedChange={() => handleIntervalToggle(interval)}
                  />
                  <Label htmlFor={checkboxId}>
                    {getIntervalLabel(interval)}
                  </Label>
                </Item>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
