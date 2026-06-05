import type { ReactNode } from "react";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
import { LogosTelegram } from "./logos-telegram";

type TelegramNotificationsCardShellProps = {
  children: ReactNode;
  footerAction?: ReactNode;
  headerAction?: ReactNode;
};

export const TelegramNotificationsCardShell = ({
  children,
  footerAction,
  headerAction,
}: TelegramNotificationsCardShellProps) => {
  return (
    <Item variant="outline" className="flex-col items-stretch gap-4">
      <ItemHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ItemMedia variant="icon" className="rounded-xl">
            <LogosTelegram className="size-5" />
          </ItemMedia>

          <div className="min-w-0 space-y-1">
            <ItemTitle>{m.settings_notifications_telegram_title()}</ItemTitle>
            <ItemDescription className="max-w-xl">
              {m.settings_notifications_telegram_description()}
            </ItemDescription>
          </div>
        </div>

        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </ItemHeader>

      <div>{children}</div>

      {footerAction ? <div>{footerAction}</div> : null}
    </Item>
  );
};
