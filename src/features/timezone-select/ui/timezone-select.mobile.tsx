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
  trigger: React.ReactNode;
  content: React.ReactNode;
};

export const TimezoneSelectMobile = ({
  open,
  onOpenChange,
  trigger,
  content,
}: TimezoneSelectMobileProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select Timezone</DrawerTitle>
            <DrawerDescription>
              Search and select your timezone
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
