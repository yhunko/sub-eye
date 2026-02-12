import { NotificationsButton } from "./notifications-button";
import { NotificationsStatus } from "./notifications-status";
import { NotificationTimeSelect } from "./notification-time-select";
import { Button } from "@/shared/components/ui/button";
import { usePushNotificationsSubscription } from "../api/hooks";
import { toast } from "sonner";
import { usePushNotificationsSupport } from "../model/use-push-notifications-support";
import { useMutation } from "@tanstack/react-query";
import { apiClient as client } from "../../../shared/api/client";

export const SettingsNotificationsForm = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <NotificationsStatus />
        <NotificationsButton />
      </div>

      <div className="flex flex-col gap-4">
        <NotificationTimeSelect />
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
