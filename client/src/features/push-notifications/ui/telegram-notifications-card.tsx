import NiceModal from "@ebay/nice-modal-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  Spinner,
  Switch,
} from "@/shared/components";
import {
  useDisconnectTelegramNotifications,
  useSendTelegramTestNotification,
  useTelegramNotificationStatus,
  useUpdateTelegramNotificationPreferences,
} from "../api/hooks";
import { getTelegramBotUrl } from "../lib/telegram-notifications.utils";
import { pushNotificationsQueryKeys } from "../model/query-keys";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { TelegramTemplateBuilderModal } from "./telegram-template-builder-modal";
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
  const { mutate: sendTest, isPending: isSendingTest } =
    useSendTelegramTestNotification();

  const isLinked = status?.linked === true;
  const isEnabled = status?.enabled === true;
  const isBusy = isUpdatingPreferences || isDisconnecting || isSendingTest;
  const openBotUrl = getTelegramBotUrl(status?.botUsername);

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

  const handleDisconnect = () => {
    disconnect(undefined, {
      onSuccess: () => {
        toast.success(m.settings_notifications_telegram_disconnected());
      },
      onError: () => {
        toast.error(m.settings_notifications_telegram_disconnectFailed());
      },
    });
  };

  const handleTest = () => {
    sendTest(undefined, {
      onSuccess: () => {
        toast.success(m.settings_notifications_telegram_testSent());
      },
      onError: () => {
        toast.error(m.settings_notifications_telegram_testFailed());
      },
    });
  };

  let connectionAction = <Spinner />;

  if (!isLoading && isStatusError) {
    connectionAction = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void refetchStatus()}
      >
        {m.settings_notifications_telegram_connect_retry()}
      </Button>
    );
  }

  if (!isLoading && !isStatusError && isLinked) {
    connectionAction = (
      <Switch
        id="telegram-notification-toggle"
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isBusy}
        aria-label={m.settings_notifications_telegram_toggleAria()}
      />
    );
  }

  if (!isLoading && !isStatusError && !isLinked) {
    connectionAction = (
      <Button
        type="button"
        size="sm"
        onClick={() => void handleConnect()}
        disabled={isBusy}
      >
        {m.settings_notifications_telegram_connect()}
      </Button>
    );
  }

  return (
    <Item variant="outline" className="flex-col items-stretch gap-3">
      <div className="flex items-start justify-between gap-2">
        <ItemContent>
          <ItemTitle>{m.settings_notifications_telegram_title()}</ItemTitle>
          <ItemDescription>
            {m.settings_notifications_telegram_description()}
          </ItemDescription>
        </ItemContent>
        <ItemActions>{connectionAction}</ItemActions>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isStatusError ? (
          <Badge variant="destructive">{m.messages_error()}</Badge>
        ) : (
          <>
            <Badge variant="outline">
              {isLinked
                ? m.settings_notifications_telegram_status_connected()
                : m.settings_notifications_telegram_status_notConnected()}
            </Badge>
            {isLinked && (
              <Badge variant="outline">
                {isEnabled
                  ? m.settings_notifications_telegram_status_enabled()
                  : m.settings_notifications_telegram_status_disabled()}
              </Badge>
            )}
            {status?.accountLabel && (
              <Badge variant="outline">{status.accountLabel}</Badge>
            )}
          </>
        )}
      </div>

      {isLinked && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isBusy}
          >
            {isSendingTest
              ? m.settings_notifications_telegram_testSending()
              : m.settings_notifications_telegram_test()}
          </Button>
          {openBotUrl && (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={openBotUrl} target="_blank" rel="noreferrer">
                {m.settings_notifications_telegram_openBot()}
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isBusy}
          >
            {m.settings_notifications_telegram_disconnect()}
          </Button>
        </div>
      )}

      {!isLoading && !isStatusError && status && (
        <div className="flex flex-wrap gap-2">
          <TelegramTemplateBuilderModal status={status} />
        </div>
      )}
    </Item>
  );
};
