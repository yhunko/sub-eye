import * as m from "@/i18n/messages";
import { useUser } from "@clerk/clerk-react";
import { useUpdateUserMetadata } from "@/entities/user/api/use-update-user-metadata";
import {
  Field,
  FieldLabel,
  InputGroup,
  InputGroupInput,
  FieldDescription,
  Spinner,
  InputGroupAddon,
} from "@/shared/components";
import { useState, ChangeEventHandler, KeyboardEventHandler } from "react";
import { NotificationOffsetSelect } from "./notification-offset-select";

export const NotificationTimeSelect = () => {
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const currentTime = user?.publicMetadata?.notificationTime ?? "10:00";
  const [time, setTime] = useState(currentTime);

  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const val = event.target.value;

    if (val) {
      setTime(() => val);
    }
  };

  const handleBlur = () => {
    if (currentTime === time) return;

    mutate({ notificationTime: time });
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <Field>
      <FieldLabel htmlFor="time-picker">
        {m.settings_notifications_time_label()}
        {isPending && <Spinner />}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="time-picker"
          value={time}
          onChange={handleTimeChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          type="time"
          step="900"
          disabled={isPending}
        />
        <InputGroupAddon align="inline-end" className="overflow-hidden pr-2">
          <NotificationOffsetSelect />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>
        {m.settings_notifications_time_desc()}
      </FieldDescription>
    </Field>
  );
};
