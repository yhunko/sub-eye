import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import { useUpdateUserMetadata } from "@/entities/user";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

const AVAILABLE_INTERVALS = [14, 7, 3, 1] as const;
const DEFAULT_INTERVALS = [7, 3] as number[];

const getIntervalLabel = (interval: (typeof AVAILABLE_INTERVALS)[number]) => {
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
      : DEFAULT_INTERVALS;

  const handleToggle = (nextEnabled: boolean) => {
    if (!canUseExpiryNotifications) {
      return;
    }
    mutate({ expiryNotificationsEnabled: nextEnabled });
  };

  const handleIntervalToggle = (
    interval: (typeof AVAILABLE_INTERVALS)[number],
  ) => {
    if (!canUseExpiryNotifications || !expiryEnabled) {
      return;
    }

    const nextIntervals = selectedIntervals.includes(interval)
      ? selectedIntervals.filter((value) => value !== interval)
      : [...selectedIntervals, interval];
    const normalizedIntervals =
      nextIntervals.length > 0 ? nextIntervals : [...DEFAULT_INTERVALS];

    mutate({
      expiryNotificationIntervals: normalizedIntervals.sort((a, b) => b - a),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_notifications_expiry_title()}</CardTitle>
        <CardDescription>
          {m.settings_notifications_expiry_description()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canUseExpiryNotifications && (
          <PlanFeatureLockCard
            title={m.settings_notifications_expiry_lockTitle()}
            description={m.settings_notifications_expiry_lockDescription()}
            analyticsSource="expiry_notifications"
          />
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {m.settings_notifications_expiry_toggle_label()}
            </p>
          </div>
          <Switch
            checked={expiryEnabled}
            disabled={!canUseExpiryNotifications || !isLoaded || isPending}
            onCheckedChange={handleToggle}
            aria-label={m.settings_notifications_expiry_toggle_label()}
          />
        </div>

        {expiryEnabled && canUseExpiryNotifications && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {m.settings_notifications_expiry_intervals_label()}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {AVAILABLE_INTERVALS.map((interval) => {
                const checkboxId = `expiry-notification-${interval}`;
                return (
                  <div key={interval} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={selectedIntervals.includes(interval)}
                      disabled={isPending}
                      onCheckedChange={() => handleIntervalToggle(interval)}
                    />
                    <Label htmlFor={checkboxId}>
                      {getIntervalLabel(interval)}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
