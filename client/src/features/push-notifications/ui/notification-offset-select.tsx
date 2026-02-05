import * as m from "@/i18n/messages";
import { useUser } from "@clerk/clerk-react";
import { useUpdateUserMetadata } from "@/entities/user/api/use-update-user-metadata";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useState } from "react";
import { Spinner } from "@/shared/components";

export const NotificationOffsetSelect = () => {
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();
  const currentOffset =
    user?.publicMetadata?.notificationOffset?.toString() ?? "0";
  const [offset, setOffset] = useState<string>(currentOffset);

  const handleOffsetChange = (value: string) => {
    setOffset(() => value);
    mutate({ notificationOffset: Number(value) });
  };

  return (
    <Select
      value={offset}
      onValueChange={handleOffsetChange}
      disabled={isPending}
    >
      <SelectTrigger
        id="offset-picker"
        size="sm"
        className="border-0 bg-transparent dark:bg-transparent"
      >
        <SelectValue
          placeholder={m.settings_notifications_offset_placeholder()}
          className="text-xs"
        />
        {isPending && <Spinner />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">
          {m.settings_notifications_offset_day()}
        </SelectItem>
        <SelectItem value="1">
          {m.settings_notifications_offset_1day()}
        </SelectItem>
        <SelectItem value="2">
          {m.settings_notifications_offset_2days()}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
