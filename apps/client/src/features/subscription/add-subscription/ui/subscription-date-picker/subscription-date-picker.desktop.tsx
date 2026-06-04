import type { FC, ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

interface SubscriptionDatePickerDesktopProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: ReactNode;
  Content: ReactNode;
}

const SubscriptionDatePickerDesktop: FC<SubscriptionDatePickerDesktopProps> = ({
  open,
  onOpenChange,
  Trigger,
  Content,
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {Content}
      </PopoverContent>
    </Popover>
  );
};

export default SubscriptionDatePickerDesktop;
