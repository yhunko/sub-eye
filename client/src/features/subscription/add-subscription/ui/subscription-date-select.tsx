import {
  PopoverTrigger,
  Button,
  PopoverContent,
  Calendar,
  Popover,
} from "@/shared/components";
import { ChevronDownIcon } from "lucide-react";
import { useState, FC } from "react";
import { addYears } from "date-fns";
import * as m from "@/i18n/messages";

const endMonth = addYears(new Date(), 10);

type SubscriptionDateSelectProps = {
  value?: Date;
  onChange: (newDate?: Date) => void;
};

export const SubscriptionDateSelect: FC<SubscriptionDateSelectProps> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date"
          className="w-full justify-between font-normal"
        >
          {value ? value.toLocaleDateString() : m.date_selectDate()}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  );
};
