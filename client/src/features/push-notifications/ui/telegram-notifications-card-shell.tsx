import type { ReactNode } from "react";
import { Item } from "@/shared/components/ui/item";
import { LogosTelegram } from "./logos-telegram";
import * as m from "@/i18n/messages";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <LogosTelegram className="size-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <h3 className="text-sm leading-tight font-medium">
              {m.settings_notifications_telegram_title()}
            </h3>
            <p className="text-muted-foreground max-w-xl text-sm leading-normal">
              {m.settings_notifications_telegram_description()}
            </p>
          </div>
        </div>

        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      <div>{children}</div>

      {footerAction ? <div>{footerAction}</div> : null}
    </Item>
  );
};
