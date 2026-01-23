"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

type TimezoneSelectDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: React.ReactNode;
  Content: React.ReactNode;
};

export const TimezoneSelectDesktop = ({
  open,
  onOpenChange,
  Trigger,
  Content,
}: TimezoneSelectDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {Content}
      </PopoverContent>
    </Popover>
  );
};
