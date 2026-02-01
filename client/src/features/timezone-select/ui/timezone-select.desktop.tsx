import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";
import { ReactNode } from "react";

type TimezoneSelectDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Trigger: ReactNode;
  Content: ReactNode;
};

const TimezoneSelectDesktop = ({
  open,
  onOpenChange,
  Trigger,
  Content,
}: TimezoneSelectDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent className="w-75 p-0" align="start">
        {Content}
      </PopoverContent>
    </Popover>
  );
};

export default TimezoneSelectDesktop;
