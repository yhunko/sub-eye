"use client";

import * as React from "react";
import { FC } from "react";
import dynamic from "next/dynamic";
import { ChevronsUpDown } from "lucide-react";
import { useMounted } from "@mantine/hooks";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { useTimezoneOptions } from "../lib/use-timezone-options";
import { TimezoneList } from "./timezone-list";
import { SharedProps } from "../model/props";

const TimezoneSelectDesktop = dynamic(
  () =>
    import("./timezone-select.desktop").then(
      (mod) => mod.TimezoneSelectDesktop,
    ),
  { ssr: false },
);

const TimezoneSelectMobile = dynamic(
  () =>
    import("./timezone-select.mobile").then((mod) => mod.TimezoneSelectMobile),
  { ssr: false },
);

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
  const mounted = useMounted();
  const isDesktop = useBreakpoint("md");
  const options = useTimezoneOptions();

  const selectedOption = options.find((opt) => opt.value === value);

  const sharedProps: SharedProps = { disabled, placeholder, emptyTitle };
  const trigger = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
    >
      {selectedOption ? selectedOption.label : "Select timezone..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
  const content = (
    <TimezoneList
      options={options}
      value={value}
      onSelect={(val) => {
        onChange(val);
        setOpen(false);
      }}
      {...sharedProps}
    />
  );

  if (!mounted) {
    return trigger;
  }

  if (isDesktop) {
    return (
      <TimezoneSelectDesktop
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        content={content}
      />
    );
  }

  return (
    <TimezoneSelectMobile
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      content={content}
    />
  );
};
