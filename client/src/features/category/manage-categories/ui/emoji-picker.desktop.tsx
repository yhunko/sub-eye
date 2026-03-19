import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components";

type EmojiPickerDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  content: ReactNode;
  container?: HTMLElement | null;
  onOpenAutoFocus?: React.ComponentProps<
    typeof PopoverContent
  >["onOpenAutoFocus"];
};

const EmojiPickerDesktop = ({
  open,
  onOpenChange,
  trigger,
  content,
  container,
  onOpenAutoFocus,
}: EmojiPickerDesktopProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        container={container ?? undefined}
        align="start"
        className="w-72 max-w-[calc(100vw-1rem)] p-2"
        onOpenAutoFocus={onOpenAutoFocus}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerDesktop;
