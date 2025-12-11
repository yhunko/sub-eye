"use client";

import { FC } from "react";
import {
  Field,
  FieldLabel,
  Spinner,
  TimezoneSelect,
} from "@/shared/components";
import {
  useUpdateUserPublicMetadata,
  useUserPublicMetadata,
} from "@/entities/user";

export const PreferredTimezoneSelect: FC = () => {
  const { data: publicMetadata, isLoading: isPublicMetadataLoading } =
    useUserPublicMetadata();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || isPublicMetadataLoading;

  return (
    <Field>
      <FieldLabel htmlFor="preferred-timezone">
        Preferred Timezone
        {isLoading && <Spinner />}
      </FieldLabel>
      <TimezoneSelect
        value={publicMetadata?.preferredTimezone}
        onChange={(preferredTimezone) => mutate({ preferredTimezone })}
        disabled={isLoading}
      />
    </Field>
  );
};
