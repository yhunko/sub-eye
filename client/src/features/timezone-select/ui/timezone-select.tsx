import { FC, ComponentProps, useState, lazy, Suspense } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import {
  useTimezoneOptions,
  TimezoneOption,
} from "../lib/use-timezone-options";
import { TimezoneList } from "./timezone-list";
import { SharedProps } from "../model/props";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";

type TimezoneSelectTriggerProps = {
  open: boolean;
  selectedOption?: TimezoneOption;
  disabled?: boolean;
} & ComponentProps<typeof Button>;
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
      {selectedOption
        ? selectedOption.label
        : m.components_timezoneSelect_trigger()}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}

const TimezoneSelectDesktop = lazy(() => import("./timezone-select.desktop"));

const TimezoneSelectMobile = lazy(() => import("./timezone-select.mobile"));

interface TimezoneSelectProps extends SharedProps {
  value?: string;
  onChange: (value: string) => void;
}

export const TimezoneSelect: FC<TimezoneSelectProps> = ({
  value = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onChange,
  disabled = false,
  placeholder = m.components_timezoneSelect_search(),
  emptyTitle = m.components_timezoneSelect_empty(),
}) => {
  const [open, setOpen] = useState(false);
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

  if (isDesktop) {
    return (
      <Suspense fallback={_Trigger}>
        <TimezoneSelectDesktop
          open={open}
          onOpenChange={setOpen}
          Trigger={_Trigger}
          Content={content}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={_Trigger}>
      <TimezoneSelectMobile
        open={open}
        onOpenChange={setOpen}
        Trigger={_Trigger}
        Content={content}
      />
    </Suspense>
  );
};
