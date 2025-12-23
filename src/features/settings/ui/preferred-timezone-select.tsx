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
import {
  useUpdateUserPublicMetadata,
  useUserPublicMetadata,
} from "@/entities/user";
import { Globe } from "lucide-react";

export const PreferredTimezoneSelect: FC = () => {
  const { data: publicMetadata, isLoading: isPublicMetadataLoading } =
    useUserPublicMetadata();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || isPublicMetadataLoading;

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
          value={publicMetadata?.preferredTimezone}
          onChange={(preferredTimezone) => mutate({ preferredTimezone })}
          disabled={isLoading}
        />
      </div>
    </Item>
  );
};
