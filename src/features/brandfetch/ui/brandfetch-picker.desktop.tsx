"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

type BrandfetchPickerDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  content: React.ReactNode;
};

export const BrandfetchPickerDesktop = ({
  open,
  onOpenChange,
  trigger,
  content,
}: BrandfetchPickerDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};
