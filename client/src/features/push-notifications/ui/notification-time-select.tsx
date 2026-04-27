import { useUser } from "@clerk/clerk-react";
import { Clock, Lock } from "lucide-react";
import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
  useState,
} from "react";
import { NOTIFICATION_SCHEDULE_DEFAULTS } from "shared";
import { useUpdateUserMetadata } from "@/entities/user/api/use-update-user-metadata";
import * as m from "@/i18n/messages";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  Spinner,
} from "@/shared/components";
import { NotificationOffsetSelect } from "./notification-offset-select";

type NotificationTimeSelectProps = {
  scheduleLocked?: boolean;
};

export const NotificationTimeSelect = ({
  scheduleLocked = false,
}: NotificationTimeSelectProps) => {
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const currentTime = scheduleLocked
    ? NOTIFICATION_SCHEDULE_DEFAULTS.notificationTime
    : (user?.publicMetadata?.notificationTime ??
      NOTIFICATION_SCHEDULE_DEFAULTS.notificationTime);
  const [time, setTime] = useState(currentTime);

  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (scheduleLocked) {
      return;
    }

    const val = event.target.value;

    if (val) {
      setTime(() => val);
    }
  };

  const handleBlur = () => {
    if (scheduleLocked) {
      return;
    }

    if (currentTime === time) return;

    mutate({ notificationTime: time });
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <Item variant="outline" className="flex-col items-stretch gap-3">
      <ItemContent>
        <ItemTitle className="gap-2">
          {m.settings_notifications_time_label()}
          {isPending && <Spinner />}
        </ItemTitle>
      </ItemContent>
      <InputGroup>
        <InputGroupAddon>
          {scheduleLocked ? <Lock /> : <Clock />}
        </InputGroupAddon>
        <InputGroupInput
          id="time-picker"
          value={time}
          onChange={handleTimeChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          type="time"
          step="900"
          disabled={isPending || scheduleLocked}
          className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
        <InputGroupAddon align="inline-end" className="overflow-hidden pr-2">
          <NotificationOffsetSelect
            disabled={isPending || scheduleLocked}
            lockToDefault={scheduleLocked}
          />
        </InputGroupAddon>
      </InputGroup>
      <ItemDescription className="line-clamp-none">
        {scheduleLocked
          ? m.settings_notifications_schedule_lockedDescription()
          : m.settings_notifications_time_desc()}
      </ItemDescription>
    </Item>
  );
};
