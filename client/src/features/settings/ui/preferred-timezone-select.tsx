import { FC } from "react";
import {
  Spinner,
  Item,
  ItemContent,
  ItemTitle,
  ItemMedia,
} from "@/shared/components";
import { Globe } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { TimezoneSelect } from "../../timezone-select";
import { useUpdateUserMetadata } from "../../../entities/user";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";

export const PreferredTimezoneSelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const isLoading = isPending || !isLoaded;

  return (
    <Item variant="outline">
      <ItemMedia>
        <Globe />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {m.settings_general_timezone_label()}
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>

      <div className="w-full">
        <TimezoneSelect
          value={user?.publicMetadata?.preferredTimezone}
          onChange={(preferredTimezone) =>
            mutate(
              { preferredTimezone },
              {
                onSuccess: () => {
                  track("settings_general_saved", {
                    theme_changed: false,
                    locale_changed: false,
                    currency_changed: false,
                    timezone_changed: true,
                    date_format_changed: false,
                  });
                },
              },
            )
          }
          disabled={isLoading}
          placeholder={m.components_timezoneSelect_search()}
          emptyTitle={m.components_timezoneSelect_empty()}
        />
      </div>
    </Item>
  );
};
