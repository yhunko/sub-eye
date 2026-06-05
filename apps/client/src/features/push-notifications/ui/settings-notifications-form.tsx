import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";
import { track } from "@/shared/lib/analytics";
import { apiClient as client } from "../../../shared/api/client";
import { usePushNotificationsSubscription } from "../api/hooks";
import { usePushNotificationsSupport } from "../model/use-push-notifications-support";
import { ExpiryNotificationsCard } from "./expiry-notifications-card";
import { NotificationTimeSelect } from "./notification-time-select";
import { NotificationsButton } from "./notifications-button";
import { NotificationsStatus } from "./notifications-status";
import { TelegramNotificationsCard } from "./telegram-notifications-card";

export const SettingsNotificationsForm = () => {
  const { userId } = useAuth();
  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId! },
      options: { enabled: Boolean(userId) },
    }),
  );
  const canEditSchedule = usage?.features.notificationSchedule === true;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <NotificationsStatus />
        <NotificationsButton />
        <TelegramNotificationsCard />
        <ExpiryNotificationsCard />
      </div>

      <div className="flex flex-col gap-4">
        {!canEditSchedule && (
          <PlanFeatureLockCard
            title={m.settings_notifications_schedule_lockTitle()}
            description={m.settings_notifications_schedule_lockDescription()}
            analyticsSource="notification_schedule"
          />
        )}
        <NotificationTimeSelect
          key={String(canEditSchedule)}
          scheduleLocked={!canEditSchedule}
        />
        <TestNotificationButton />
      </div>
    </div>
  );
};

const TestNotificationButton = () => {
  const isSupported = usePushNotificationsSupport();
  const { data: subscription } = usePushNotificationsSubscription();
  const { mutate: sendTest, isPending } = useMutation({
    mutationFn: async () => {
      await client.api["push-notifications"].test.$post();
    },
  });

  if (!isSupported || !subscription) {
    return null;
  }

  const handleTest = () => {
    sendTest(undefined, {
      onSuccess: () => {
        track("notifications_test_sent", { channel: "push" });
        toast.success("Test notification sent!");
      },
      onError: () => {
        toast.error("Failed to send test notification");
      },
    });
  };

  return (
    <Button
      className="w-full max-w-md self-center"
      variant="outline"
      onClick={handleTest}
      disabled={isPending}
    >
      {isPending ? "Sending..." : "Test Push Notification"}
    </Button>
  );
};
