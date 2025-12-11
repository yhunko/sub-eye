"use client";

import { FC } from "react";
import {
  Field,
  FieldLabel,
  Spinner,
  TimezoneSelect,
} from "@/shared/components";
import { useUser } from "@clerk/nextjs";
import { useUpdateUserPublicMetadata } from "@/entities/user";

export const PreferredTimezoneSelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || !isLoaded;

  return (
    <Field>
      <FieldLabel htmlFor="preferred-timezone">
        Preferred Timezone
        {isLoading && <Spinner />}
      </FieldLabel>
      <TimezoneSelect
        value={user?.publicMetadata.preferredTimezone as string | undefined}
        onChange={(preferredTimezone) => mutate({ preferredTimezone })}
        disabled={isLoading}
      />
    </Field>
  );
};
