"use client";

import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/shared/components";
import { Shredder } from "lucide-react";
import { useState } from "react";
import { useDeleteAccount } from "@/entities/user/api/hooks";
import { useRouter } from "next/navigation";
import { PopoverConfirmationContent } from "@/shared/components/ui/popover-confirmation-content";

export const DeleteAccountButton = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutate, isPending } = useDeleteAccount({
    options: {
      onSettled: () => setOpen(false),
    },
  });

  const handleConfirm = async () => {
    mutate(
      {},
      {
        async onSuccess() {
          router.replace("/");
          router.refresh();
        },
      },
    );
  };

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Delete Account</ItemTitle>
        <ItemDescription>
          This will remove all of the associated data
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="destructive"
              onClick={() => setOpen(true)}
              disabled={isPending}
            >
              <Shredder />
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <PopoverConfirmationContent
              description="Are you sure? This action is destructive and will permanently
                delete your account and all associated data."
              CancelButton={
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              }
              ConfirmButton={
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Yes, delete my account"}
                </Button>
              }
            />
          </PopoverContent>
        </Popover>
      </ItemActions>
    </Item>
  );
};
