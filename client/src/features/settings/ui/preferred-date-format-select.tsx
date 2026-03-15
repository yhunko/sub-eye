import { FC } from "react";
import {
  Spinner,
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components";
import { useUpdateUserMetadata } from "@/entities/user";
import { Calendar } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { DateFormatUtils } from "shared";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";
import { format } from "date-fns";

const now = new Date();

export const PreferredDateFormatSelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const isLoading = isPending || !isLoaded;

  const preferredDateFormat = user?.publicMetadata?.preferredDateFormat;
  const currentFormat = DateFormatUtils.getConfig(preferredDateFormat);

  const formats = DateFormatUtils.getAllFormats();

  return (
    <Item variant="outline">
      <ItemMedia>
        <Calendar />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {m.settings_general_dateFormat_label()}
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <Select
          value={currentFormat.format}
          onValueChange={(nextFormat) =>
            mutate(
              { preferredDateFormat: nextFormat },
              {
                onSuccess: () => {
                  track("settings_general_saved", {
                    theme_changed: false,
                    locale_changed: false,
                    currency_changed: false,
                    timezone_changed: false,
                    date_format_changed: true,
                  });
                },
              },
            )
          }
          disabled={isLoading}
        >
          <SelectTrigger id="preferred-date-format" className="w-35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formats.map((item) => (
              <SelectItem key={item.format} value={item.format}>
                {format(now, item.dateFnsFormat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ItemActions>
    </Item>
  );
};
