import * as m from "@/i18n/messages";
import { useUser } from "@clerk/clerk-react";
import { useUpdateUserMetadata } from "@/entities/user/api/use-update-user-metadata";
import { NOTIFICATION_SCHEDULE_DEFAULTS } from "shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Spinner } from "@/shared/components";

type NotificationOffsetSelectProps = {
  disabled?: boolean;
  lockToDefault?: boolean;
};

export const NotificationOffsetSelect = ({
  disabled = false,
  lockToDefault = false,
}: NotificationOffsetSelectProps) => {
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();
  const defaultOffset = NOTIFICATION_SCHEDULE_DEFAULTS.notificationOffset;
  const currentOffset = lockToDefault
    ? defaultOffset.toString()
    : (user?.publicMetadata?.notificationOffset?.toString() ??
      defaultOffset.toString());

  const handleOffsetChange = (value: string) => {
    if (disabled || lockToDefault) {
      return;
    }

    mutate({ notificationOffset: Number(value) });
  };

  return (
    <Select
      value={currentOffset}
      onValueChange={handleOffsetChange}
      disabled={isPending || disabled}
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
        {isPending && !disabled && <Spinner />}
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
