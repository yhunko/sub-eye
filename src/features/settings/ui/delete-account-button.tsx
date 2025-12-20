"use client";

import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/shared/components";
import { Shredder } from "lucide-react";
import { useState } from "react";
import { useDeleteAccount } from "@/entities/user/api/hooks";
import { useRouter } from "next/navigation";

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
    <FieldSet>
      <FieldLegend>Delete Account</FieldLegend>
      <FieldDescription>
        This will remove all of the accosiated data
      </FieldDescription>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="destructive"
            onClick={() => setOpen(true)}
            disabled={isPending}
          >
            <Shredder />
            {isPending ? "Deleting..." : "Delete Account"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <p className="text-sm">
              Are you sure? This action is destructive and will permanently
              delete your account and all associated data.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Yes, delete my account"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </FieldSet>
  );
};
