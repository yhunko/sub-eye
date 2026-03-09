import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import type { TelegramNotificationStatus } from "shared";
import { TelegramTemplateBuilderCard } from "./telegram-template-builder-card";
import * as m from "@/i18n/messages";

type TelegramTemplateBuilderModalProps = {
  status: TelegramNotificationStatus;
};

export const TelegramTemplateBuilderModal = ({
  status,
}: TelegramTemplateBuilderModalProps) => {
  const isDesktop = useBreakpoint("md");
  const [open, setOpen] = useState(false);

  const content = (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <TelegramTemplateBuilderCard
        key={status.messageTemplate.template}
        status={status}
        withContainer={false}
        showHeader={false}
      />
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {m.settings_notifications_telegram_template_open()}
      </Button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden md:max-w-[95vw] xl:max-w-7xl">
            <DialogHeader className="border-b px-4 py-3 text-left md:px-6 md:py-4">
              <DialogTitle>
                {m.settings_notifications_telegram_template_modalTitle()}
              </DialogTitle>
              <DialogDescription>
                {m.settings_notifications_telegram_template_modalDescription()}
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="border-b text-left">
              <DrawerTitle>
                {m.settings_notifications_telegram_template_modalTitle()}
              </DrawerTitle>
              <DrawerDescription>
                {m.settings_notifications_telegram_template_modalDescription()}
              </DrawerDescription>
            </DrawerHeader>
            {content}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};
