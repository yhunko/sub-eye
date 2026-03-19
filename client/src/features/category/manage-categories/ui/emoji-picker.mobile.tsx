import { ReactNode } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components";

type EmojiPickerMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  content: ReactNode;
  title: string;
  description: string;
};

const EmojiPickerMobile = ({
  open,
  onOpenChange,
  trigger,
  content,
  title,
  description,
}: EmojiPickerMobileProps) => {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      dismissible={true}
      repositionInputs={false}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <VisuallyHidden.Root>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden.Root>
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden border-t p-2">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EmojiPickerMobile;
