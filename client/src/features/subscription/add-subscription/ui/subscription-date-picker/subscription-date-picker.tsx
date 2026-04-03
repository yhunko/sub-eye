import { format } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { type FC, lazy, Suspense, useState } from "react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/classes-utils";
import { SubscriptionDatePickerContent } from "./subscription-date-picker-content";

const DesktopPicker = lazy(() => import("./subscription-date-picker.desktop"));
const MobilePicker = lazy(() => import("./subscription-date-picker.mobile"));

type SubscriptionDatePickerProps = {
  value?: Date;
  onChange: (newDate: Date) => void;
  minDate?: Date;
  className?: string;
  error?: boolean;
  clearable?: boolean;
  onClear?: () => void;
};

export const SubscriptionDatePicker: FC<SubscriptionDatePickerProps> = ({
  value,
  onChange,
  minDate,
  className,
  error,
  clearable = false,
  onClear,
}) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useBreakpoint("md");
  const dateFormatConfig = useDateFormat();

  const Trigger = (
    <Button
      variant="outline"
      id="date"
      className={cn(
        "w-full justify-between font-normal",
        !value && "text-muted-foreground",
        error && "border-destructive text-destructive",
        className,
      )}
    >
      <span className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        {value
          ? format(value, dateFormatConfig.dateFnsFormat)
          : m.date_selectDate()}
      </span>
      <ChevronDownIcon className="h-4 w-4 opacity-50" />
    </Button>
  );

  const Content = (
    <SubscriptionDatePickerContent
      value={value}
      onChange={onChange}
      minDate={minDate}
      onClose={() => setOpen(false)}
      clearable={clearable}
      onClear={onClear}
    />
  );

  const sharedProps = {
    open,
    onOpenChange: setOpen,
    Trigger,
    Content,
  };

  if (isDesktop) {
    return (
      <Suspense fallback={Trigger}>
        <DesktopPicker {...sharedProps} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={Trigger}>
      <MobilePicker {...sharedProps} />
    </Suspense>
  );
};
