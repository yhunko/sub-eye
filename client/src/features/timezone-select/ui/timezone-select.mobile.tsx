import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { ReactNode } from "react";

type TimezoneSelectMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: ReactNode;
  Content: ReactNode;
};

const TimezoneSelectMobile = ({
  open,
  onOpenChange,
  Trigger,
  Content,
}: TimezoneSelectMobileProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {m.components_timezoneSelect_mobile_title()}
            </DrawerTitle>
            <DrawerDescription>
              {m.components_timezoneSelect_mobile_description()}
            </DrawerDescription>
          </DrawerHeader>
          {Content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TimezoneSelectMobile;
