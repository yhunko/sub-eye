"use client";

import * as React from "react";
import { useMemo, useRef, FC, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components";

type TimezoneSelectProps = {
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
};

export const TimezoneSelect: FC<TimezoneSelectProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const defaultValue = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  const rowVirtualizer = useVirtualizer({
    count: timezones.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 32,
    overscan: 4,
  });

  const items = rowVirtualizer.getVirtualItems();
  const currentValue = value ?? defaultValue;

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Timezone">{currentValue}</SelectValue>
      </SelectTrigger>

      {/* 2. Pass setParentRef here */}
      <SelectContent viewportRef={viewportRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {items.map((virtualRow) => (
            <SelectItem
              key={virtualRow.key}
              value={timezones[virtualRow.index]}
              className="absolute top-0 left-0 h-8 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {timezones[virtualRow.index]}
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
};
