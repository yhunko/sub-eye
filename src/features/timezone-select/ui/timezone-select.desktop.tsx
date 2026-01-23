"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

type TimezoneSelectDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  content: React.ReactNode;
};

export const TimezoneSelectDesktop = ({
  open,
  onOpenChange,
  trigger,
  content,
}: TimezoneSelectDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};
