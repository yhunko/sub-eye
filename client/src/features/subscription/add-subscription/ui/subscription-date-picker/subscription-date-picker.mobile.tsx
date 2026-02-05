import { FC, ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/shared/components";
import * as m from "@/i18n/messages";

interface SubscriptionDatePickerMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: ReactNode;
  Content: ReactNode;
}

const SubscriptionDatePickerMobile: FC<SubscriptionDatePickerMobileProps> = ({
  open,
  onOpenChange,
  Trigger,
  Content,
}) => {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
      shouldScaleBackground={false}
      dismissible={true}
    >
      <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
      <DrawerContent className="min-h-[70vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{m.date_selectDate()}</DrawerTitle>
          <DrawerDescription>
            Pick a date for your subscription payment
          </DrawerDescription>
        </DrawerHeader>
        <div className="mt-4 border-t pb-8">{Content}</div>
      </DrawerContent>
    </Drawer>
  );
};

export default SubscriptionDatePickerMobile;
