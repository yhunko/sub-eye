"use client";

import { FC } from "react";
import {
  Spinner,
  Item,
  ItemContent,
  ItemTitle,
  ItemMedia,
} from "@/shared/components";
import { useUpdateUserPublicMetadata } from "@/entities/user";
import { Globe } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { TimezoneSelect } from "../../timezone-select";

export const PreferredTimezoneSelect: FC = () => {
  const t = useTranslations("settings.general.timezone");
  const tComp = useTranslations("components.timezone-select");
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
          {t("label")}
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>

      <div className="w-full">
        <TimezoneSelect
          value={user?.publicMetadata?.preferredTimezone}
          onChange={(preferredTimezone) => mutate({ preferredTimezone })}
          disabled={isLoading}
          placeholder={tComp("search")}
          emptyTitle={tComp("empty")}
        />
      </div>
    </Item>
  );
};
