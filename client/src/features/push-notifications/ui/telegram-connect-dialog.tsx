import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as m from "@/i18n/messages";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@/shared/components";
import {
  useStartTelegramLink,
  useTelegramNotificationStatus,
} from "../api/hooks";
import { TELEGRAM_CONNECT_TIMEOUT_MS } from "../lib/telegram-notifications.utils";

type LinkFlowState = {
  connectUrl: string | null;
  waitStartedAt: number | null;
  hasTimedOut: boolean;
};

const INITIAL_LINK_FLOW_STATE: LinkFlowState = {
  connectUrl: null,
  waitStartedAt: null,
  hasTimedOut: false,
};

export const TelegramConnectDialog = NiceModal.create(() => {
  const modal = useModal();
  const [linkFlowState, setLinkFlowState] = useState<LinkFlowState>(
    INITIAL_LINK_FLOW_STATE,
  );
  const { connectUrl, waitStartedAt, hasTimedOut } = linkFlowState;

  const {
    mutateAsync: startLink,
    isPending: isStartingLink,
    error: startLinkError,
  } = useStartTelegramLink();

  const shouldPollStatus = Boolean(
    modal.visible && waitStartedAt && !hasTimedOut,
  );

  const { data: status } = useTelegramNotificationStatus({
    enabled: modal.visible,
    refetchInterval: shouldPollStatus ? 2_000 : false,
  });

  const closeModal = useCallback(async () => {
    await modal.hide();
    modal.remove();
  }, [modal]);

  const initLinkFlow = useCallback(async () => {
    try {
      const response = await startLink();
      setLinkFlowState({
        connectUrl: response.connectUrl,
        waitStartedAt: Date.now(),
        hasTimedOut: false,
      });
    } catch {
      setLinkFlowState(INITIAL_LINK_FLOW_STATE);
    }
  }, [startLink]);

  useEffect(() => {
    if (!modal.visible) {
      return;
    }

    setLinkFlowState(INITIAL_LINK_FLOW_STATE);
    void initLinkFlow();
  }, [initLinkFlow, modal.visible]);

  useEffect(() => {
    if (!waitStartedAt || !modal.visible) {
      return;
    }

    const timer = setTimeout(() => {
      setLinkFlowState((current) => ({ ...current, hasTimedOut: true }));
    }, TELEGRAM_CONNECT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [waitStartedAt, modal.visible]);

  useEffect(() => {
    if (!modal.visible || !status?.linked || !waitStartedAt) {
      return;
    }

    toast.success(m.settings_notifications_telegram_connect_success());
    void closeModal();
  }, [closeModal, modal.visible, status?.linked, waitStartedAt]);

  const canOpenTelegram = Boolean(connectUrl && !hasTimedOut);
  const statusLabel = useMemo(() => {
    if (isStartingLink) {
      return m.settings_notifications_telegram_connect_preparing();
    }

    if (hasTimedOut) {
      return m.settings_notifications_telegram_connect_timeout();
    }

    if (startLinkError) {
      return m.settings_notifications_telegram_connect_failed();
    }

    return m.settings_notifications_telegram_connect_waiting();
  }, [hasTimedOut, isStartingLink, startLinkError]);

  const handleCopyLink = async () => {
    if (!connectUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(connectUrl);
      toast.success(m.settings_notifications_telegram_connect_linkCopied());
    } catch {
      toast.error(m.settings_notifications_telegram_connect_linkCopyFailed());
    }
  };

  return (
    <Dialog
      open={modal.visible}
      onOpenChange={(open) => {
        if (!open) {
          void closeModal();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {m.settings_notifications_telegram_connect_title()}
          </DialogTitle>
          <DialogDescription>
            {m.settings_notifications_telegram_connect_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>{m.settings_notifications_telegram_connect_stepOpenBot()}</p>
          <p>{m.settings_notifications_telegram_connect_stepPressStart()}</p>
          <p>{m.settings_notifications_telegram_connect_stepWait()}</p>
          <div className="text-muted-foreground flex items-center gap-2">
            {(isStartingLink || shouldPollStatus) && (
              <Spinner className="h-4 w-4" />
            )}
            <span>{statusLabel}</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-stretch">
          <Button
            type="button"
            disabled={!canOpenTelegram}
            className="w-full"
            onClick={() => {
              if (!connectUrl) {
                return;
              }

              window.open(connectUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {m.settings_notifications_telegram_connect_openBot()}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleCopyLink()}
            disabled={!connectUrl}
          >
            {m.settings_notifications_telegram_connect_copyLink()}
          </Button>
          {(hasTimedOut || startLinkError) && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void initLinkFlow()}
            >
              {m.settings_notifications_telegram_connect_retry()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
