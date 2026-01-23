"use client";

import * as React from "react";
import { FC } from "react";
import dynamic from "next/dynamic";
import { ChevronsUpDown } from "lucide-react";
import { useMounted } from "@mantine/hooks";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { cn } from "@/shared/lib";
import {
  useTimezoneOptions,
  TimezoneOption,
} from "../lib/use-timezone-options";
import { TimezoneList } from "./timezone-list";
import { SharedProps } from "../model/props";

type TimezoneSelectTriggerProps = {
  open: boolean;
  selectedOption?: TimezoneOption;
  disabled?: boolean;
} & React.ComponentProps<typeof Button>;
function Trigger({
  open,
  selectedOption,
  disabled,
  className,
  ...props
}: TimezoneSelectTriggerProps) {
  return (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("w-full justify-between", className)}
      disabled={disabled}
      {...props}
    >
      {selectedOption ? selectedOption.label : "Select timezone..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}

const TimezoneSelectDesktop = dynamic(
  () =>
    import("./timezone-select.desktop").then(
      (mod) => mod.TimezoneSelectDesktop,
    ),
  { ssr: false, loading: () => <Trigger open={false} /> },
);

const TimezoneSelectMobile = dynamic(
  () =>
    import("./timezone-select.mobile").then((mod) => mod.TimezoneSelectMobile),
  { ssr: false, loading: () => <Trigger open={false} /> },
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

  const _Trigger = (
    <Trigger selectedOption={selectedOption} open={open} disabled={disabled} />
  );

  if (!mounted) {
    return _Trigger;
  }

  if (isDesktop) {
    return (
      <TimezoneSelectDesktop
        open={open}
        onOpenChange={setOpen}
        Trigger={_Trigger}
        Content={content}
      />
    );
  }

  return (
    <TimezoneSelectMobile
      open={open}
      onOpenChange={setOpen}
      Trigger={_Trigger}
      Content={content}
    />
  );
};
