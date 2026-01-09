"use client";

import * as React from "react";
import { FC } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
  DrawerHeader,
} from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { useTimezoneOptions } from "../lib/use-timezone-options";
import { TimezoneList } from "./timezone-list";
import { SharedProps } from "../model/props";

interface TimezoneSelectProps extends SharedProps {
  value?: string;
  onChange: (value: string) => void;
}

export const TimezoneSelect: FC<TimezoneSelectProps> = ({
  value = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onChange,
  disabled = false,
  placeholder,
  emptyTitle = "No timezone found",
}) => {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useBreakpoint("md");
  const options = useTimezoneOptions();

  const selectedOption = options.find((opt) => opt.value === value);

  const sharedProps: SharedProps = { disabled, placeholder, emptyTitle };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedOption ? selectedOption.label : "Select timezone..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <TimezoneList
            options={options}
            value={value}
            onSelect={(val) => {
              onChange(val);
              setOpen(false);
            }}
            {...sharedProps}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedOption ? selectedOption.label : "Select timezone..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select Timezone</DrawerTitle>
            <DrawerDescription>
              Search and select your timezone
            </DrawerDescription>
          </DrawerHeader>
          <TimezoneList
            options={options}
            value={value}
            onSelect={(val) => {
              onChange(val);
              setOpen(false);
            }}
            {...sharedProps}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
