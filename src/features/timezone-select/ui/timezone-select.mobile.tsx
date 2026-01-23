"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components";

type TimezoneSelectMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: React.ReactNode;
  Content: React.ReactNode;
};

export const TimezoneSelectMobile = ({
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
            <DrawerTitle>Select Timezone</DrawerTitle>
            <DrawerDescription>
              Search and select your timezone
            </DrawerDescription>
          </DrawerHeader>
          {Content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
