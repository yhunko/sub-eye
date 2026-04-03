import { ChevronsUpDown } from "lucide-react";
import {
  type ComponentProps,
  type FC,
  lazy,
  Suspense,
  useId,
  useState,
} from "react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { cn } from "@/shared/lib/classes-utils";
import {
  type TimezoneOption,
  useTimezoneOptions,
} from "../lib/use-timezone-options";
import type { SharedProps } from "../model/props";
import { TimezoneList } from "./timezone-list";

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
  "aria-controls": ariaControls,
  ...props
}: TimezoneSelectTriggerProps) {
  return (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-controls={ariaControls}
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
  const listId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  const sharedProps: SharedProps = { disabled, placeholder, emptyTitle };

  const content = (
    <TimezoneList
      id={listId}
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
    <Trigger
      selectedOption={selectedOption}
      open={open}
      disabled={disabled}
      aria-controls={listId}
    />
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
