import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

type BrandfetchPickerDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  content: ReactNode;
};

const BrandfetchPickerDesktop = ({
  open,
  onOpenChange,
  trigger,
  content,
}: BrandfetchPickerDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-87.5 p-0" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default BrandfetchPickerDesktop;
