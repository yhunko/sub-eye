import type { TelegramNotificationStatus } from "@subeye/shared";
import { Bot, WandSparkles } from "lucide-react";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
import { TelegramConnectionBadgeButton } from "./telegram-connection-badge-button";
import { TelegramNotificationsCardShell } from "./telegram-notifications-card-shell";
import { TelegramTemplateBuilderModal } from "./telegram-template-builder-modal";

type TelegramDisconnectedCardProps = {
  isBusy: boolean;
  onConnect: () => void;
  status: TelegramNotificationStatus;
};

export const TelegramDisconnectedCard = ({
  isBusy,
  onConnect,
  status,
}: TelegramDisconnectedCardProps) => {
  return (
    <TelegramNotificationsCardShell
      headerAction={
        <TelegramConnectionBadgeButton
          onClick={onConnect}
          disabled={isBusy}
          mode="disconnected"
        />
      }
      footerAction={
        <TelegramTemplateBuilderModal
          status={status}
          triggerVariant="default"
          triggerIcon={<WandSparkles className="size-4" />}
          triggerClassName="w-full justify-center shadow-xs"
        />
      }
    >
      <Item className="items-center gap-3 p-0">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ItemMedia variant="icon" className="rounded-xl">
            <Bot className="size-4" />
          </ItemMedia>

          <ItemContent className="min-w-0">
            <ItemTitle>
              {m.settings_notifications_telegram_status_notConnected()}
            </ItemTitle>
            <ItemDescription className="text-xs leading-relaxed">
              {m.settings_notifications_telegram_description()}
            </ItemDescription>
          </ItemContent>
        </div>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
