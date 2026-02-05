import { FC, useState, useEffect } from "react";
import { isValid, isSameDay, addYears, format, parse, isDate } from "date-fns";
import { Calendar, Input, Label } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { withMask } from "use-mask-input";

const endMonth = addYears(new Date(), 10);

interface SubscriptionDatePickerContentProps {
  value?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  className?: string;
}

export const SubscriptionDatePickerContent: FC<
  SubscriptionDatePickerContentProps
> = ({ value, onChange, onClose, className }) => {
  // Determine the user's locale format for the placeholder
  // This is a simple approximation. For strict locale format, we might need more complex logic
  // but usually users understand their system format.
  const [inputValue, setInputValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(value);

  // Sync input value when external value changes
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setSelectedMonth(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);

    // Attempt to parse the date
    // We try to let the Date constructor handle the parsing first as it covers many cases based on browser locale
    const parsedDate = new Date(newVal);

    if (isValid(parsedDate) && newVal.length >= 8) {
      // Basic length check to avoid premature parsing of "1" or "12"
      // Check if the year is reasonable (e.g. not 0001) if needed, but Date constructor usually handles it.
      // However, user might type "12/25", defaulting to 2001 or current year depending on browser.
      // Let's rely on valid date.

      // We only update if it's a valid date and different from current
      if (!value || !isSameDay(parsedDate, value)) {
        onChange(parsedDate);
        setSelectedMonth(parsedDate);
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setInputValue(date.toLocaleDateString());
      onClose();
    }
  };

  const handleMaskComplete = () => {
    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());

    if (isDate(parsedDate)) {
      setSelectedMonth(parsedDate);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 p-3", className)}>
      <div className="grid gap-2">
        <Label htmlFor="date-input" className="sr-only">
          {m.date_selectDate()}
        </Label>
        <Input
          ref={withMask("99/99/9999", {
            oncomplete: handleMaskComplete,
          })}
          id="date-input"
          placeholder={new Date().toLocaleDateString()} // Example format placeholder
          value={inputValue}
          onChange={handleInputChange}
          className="w-full"
        />
      </div>
      <Calendar
        mode="single"
        selected={value}
        onSelect={handleCalendarSelect}
        month={selectedMonth}
        onMonthChange={setSelectedMonth}
        captionLayout="dropdown"
        endMonth={endMonth}
        className="mx-auto h-full w-full rounded-md border"
        fixedWeeks
      />
    </div>
  );
};
