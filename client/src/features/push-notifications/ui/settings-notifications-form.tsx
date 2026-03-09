import { NotificationsButton } from "./notifications-button";
import { NotificationsStatus } from "./notifications-status";
import { NotificationTimeSelect } from "./notification-time-select";
import { TelegramNotificationsCard } from "./telegram-notifications-card";
import { Button } from "@/shared/components/ui/button";
import { usePushNotificationsSubscription } from "../api/hooks";
import { toast } from "sonner";
import { usePushNotificationsSupport } from "../model/use-push-notifications-support";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient as client } from "../../../shared/api/client";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import { useAuth } from "@clerk/clerk-react";
import * as m from "@/i18n/messages";

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
      </div>

      <div className="flex flex-col gap-4">
        {!canEditSchedule && (
          <PlanFeatureLockCard
            title={m.settings_notifications_schedule_lockTitle()}
            description={m.settings_notifications_schedule_lockDescription()}
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
      const res = await client.api["push-notifications"].test.$post();
      if (!res.ok) {
        throw new Error("Failed to send test push notification");
      }
    },
  });

  if (!isSupported || !subscription) {
    return null;
  }

  const handleTest = () => {
    sendTest(undefined, {
      onSuccess: () => {
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
