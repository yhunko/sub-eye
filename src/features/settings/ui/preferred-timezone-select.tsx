"use client";

import { FC } from "react";
import {
  Spinner,
  TimezoneSelect,
  Item,
  ItemContent,
  ItemTitle,
  ItemMedia,
} from "@/shared/components";
import { useUpdateUserPublicMetadata } from "@/entities/user";
import { Globe } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export const PreferredTimezoneSelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || !isLoaded;

  return (
    <Item variant="outline">
      <ItemMedia>
        <Globe />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          Preferred Timezone
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>

      <div className="w-full">
        <TimezoneSelect
          value={user?.publicMetadata?.preferredTimezone}
          onChange={(preferredTimezone) => mutate({ preferredTimezone })}
          disabled={isLoading}
        />
      </div>
    </Item>
  );
};
