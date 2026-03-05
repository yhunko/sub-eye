import { FC, useMemo, useState } from "react";
import {
  isValid,
  isSameDay,
  addYears,
  format,
  parse,
  isDate,
  isBefore,
  startOfDay,
} from "date-fns";
import {
  Calendar,
  Field,
  FieldLabel,
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import * as m from "@/i18n/messages";
import { withMask } from "use-mask-input";
import { XIcon } from "lucide-react";

const endMonth = addYears(new Date(), 10);

interface SubscriptionDatePickerContentProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  onClose: () => void;
  className?: string;
  clearable?: boolean;
  onClear?: () => void;
}

export const SubscriptionDatePickerContent: FC<
  SubscriptionDatePickerContentProps
> = ({ value, onChange, minDate, onClose, className, clearable, onClear }) => {
  const dateFormatConfig = useDateFormat();
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const normalizedMinDate = useMemo(
    () => (minDate ? startOfDay(minDate) : undefined),
    [minDate],
  );
  const isBeforeMinDate = (date: Date) =>
    normalizedMinDate ? isBefore(startOfDay(date), normalizedMinDate) : false;
  const formattedValue = useMemo(() => {
    if (value && isValid(value)) {
      return format(value, dateFormatConfig.dateFnsFormat);
    }

    return "";
  }, [value, dateFormatConfig.dateFnsFormat]);
  const inputDisplayValue = inputValue ?? formattedValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);

    // Only attempt to parse if the input is complete (matches the mask length)
    const expectedLength = dateFormatConfig.mask.length;
    if (newVal.length !== expectedLength) {
      return;
    }

    // Parse the date using the current format
    const parsedDate = parse(
      newVal,
      dateFormatConfig.dateFnsFormat,
      new Date(),
    );

    if (isValid(parsedDate) && !isBeforeMinDate(parsedDate)) {
      if (!value || !isSameDay(parsedDate, value)) {
        onChange(parsedDate);
        setSelectedMonth(parsedDate);
      }

      setInputValue(null);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && !isBeforeMinDate(date)) {
      onChange(date);
      setInputValue(null);
      setSelectedMonth(date);
      onClose();
    }
  };

  const handleMaskComplete = () => {
    const parsedDate = parse(
      inputDisplayValue,
      dateFormatConfig.dateFnsFormat,
      new Date(),
    );

    if (isDate(parsedDate) && isValid(parsedDate)) {
      setSelectedMonth(parsedDate);
    }
  };

  const handleClear = () => {
    setInputValue(null);
    onClear?.();
  };

  return (
    <div className={cn("flex flex-col gap-3 p-3", className)}>
      <Field>
        <FieldLabel htmlFor="date-input" className="sr-only">
          {m.date_selectDate()}
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            ref={withMask(dateFormatConfig.mask, {
              oncomplete: handleMaskComplete,
            })}
            id="date-input"
            placeholder={dateFormatConfig.placeholder}
            value={inputDisplayValue}
            onChange={handleInputChange}
            className="w-full"
          />
          {clearable && (
            <InputGroupAddon onClick={handleClear} align="inline-end">
              <InputGroupButton size="icon-xs" className="ml-auto">
                <XIcon />
                <span className="sr-only">{m.common_actions_clear()}</span>
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </Field>
      <Calendar
        mode="single"
        selected={value}
        onSelect={handleCalendarSelect}
        disabled={normalizedMinDate ? { before: normalizedMinDate } : undefined}
        month={selectedMonth ?? value}
        onMonthChange={setSelectedMonth}
        captionLayout="dropdown"
        endMonth={endMonth}
        className="mx-auto h-full w-full rounded-md border"
        fixedWeeks
      />
    </div>
  );
};
