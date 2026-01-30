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

type BrandfetchPickerMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  content: ReactNode;
};

const BrandfetchPickerMobile = ({
  open,
  onOpenChange,
  trigger,
  content,
}: BrandfetchPickerMobileProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="p-0">
        <VisuallyHidden.Root>
          <DrawerHeader>
            <DrawerTitle>Search Brand</DrawerTitle>
            <DrawerDescription>Select a brand from the list</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden.Root>
        <div className="mt-4 border-t">{content}</div>
      </DrawerContent>
    </Drawer>
  );
};

export default BrandfetchPickerMobile;
