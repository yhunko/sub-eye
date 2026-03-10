import NiceModal from "@ebay/nice-modal-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useDisconnectTelegramNotifications,
  useTelegramNotificationStatus,
  useUpdateTelegramNotificationPreferences,
} from "../api/hooks";
import { openTelegramDisconnectDialog } from "../model/open-telegram-disconnect-dialog";
import { pushNotificationsQueryKeys } from "../model/query-keys";
import { TelegramConnectedCard } from "./telegram-connected-card";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { TelegramDisconnectedCard } from "./telegram-disconnected-card";
import { TelegramErrorCard } from "./telegram-error-card";
import { TelegramLoadingCard } from "./telegram-loading-card";
import * as m from "@/i18n/messages";

export const TelegramNotificationsCard = () => {
  const queryClient = useQueryClient();
  const {
    data: status,
    isLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useTelegramNotificationStatus();
  const { mutate: updatePreferences, isPending: isUpdatingPreferences } =
    useUpdateTelegramNotificationPreferences();
  const { mutate: disconnect, isPending: isDisconnecting } =
    useDisconnectTelegramNotifications();

  const isLinked = status?.linked === true;
  const isBusy = isUpdatingPreferences || isDisconnecting;

  const handleConnect = async () => {
    await NiceModal.show(TelegramConnectDialog);
    await queryClient.invalidateQueries({
      queryKey: pushNotificationsQueryKeys.telegramStatus.queryKey,
    });
  };

  const handleToggle = (enabled: boolean) => {
    updatePreferences(
      { enabled },
      {
        onSuccess: () => {
          toast.success(
            enabled
              ? m.settings_notifications_telegram_enabled()
              : m.settings_notifications_telegram_disabled(),
          );
        },
        onError: () => {
          toast.error(m.settings_notifications_telegram_updateFailed());
        },
      },
    );
  };

  const handleDisconnect = async () => {
    const shouldDisconnect = await openTelegramDisconnectDialog();

    if (!shouldDisconnect) {
      return;
    }

    disconnect(undefined, {
      onSuccess: () => {
        toast.success(m.settings_notifications_telegram_disconnected());
      },
      onError: () => {
        toast.error(m.settings_notifications_telegram_disconnectFailed());
      },
    });
  };

  if (isLoading) {
    return <TelegramLoadingCard />;
  }

  if (isStatusError || !status) {
    return <TelegramErrorCard onRetry={() => void refetchStatus()} />;
  }

  return isLinked ? (
    <TelegramConnectedCard
      status={status}
      isDisconnecting={isDisconnecting}
      isUpdatingPreferences={isUpdatingPreferences}
      onToggleEnabled={handleToggle}
      onDisconnect={() => void handleDisconnect()}
    />
  ) : (
    <TelegramDisconnectedCard
      status={status}
      isBusy={isBusy}
      onConnect={() => void handleConnect()}
    />
  );
};
