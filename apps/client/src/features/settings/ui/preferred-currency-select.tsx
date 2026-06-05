import { useUser } from "@clerk/clerk-react";
import { CurrencyUtils } from "@subeye/shared";
import { DollarSign } from "lucide-react";
import type { FC } from "react";
import { CurrencySelect } from "@/entities/currency";
import { useUpdateUserMetadata } from "@/entities/user";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
  Spinner,
} from "@/shared/components";
import { track } from "@/shared/lib/analytics";

export const PreferredCurrencySelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const isLoading = isPending || !isLoaded;

  const preferredCurrency = user?.publicMetadata?.preferredCurrency;
  const currencyValue = CurrencyUtils.normalizeCode(preferredCurrency);

  return (
    <Item variant="outline">
      <ItemMedia>
        <DollarSign />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {m.settings_general_currency_label()}
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <CurrencySelect
          id="preferred-currency"
          value={currencyValue}
          onChange={(currency) =>
            mutate(
              { preferredCurrency: currency },
              {
                onSuccess: () => {
                  track("settings_general_saved", {
                    theme_changed: false,
                    locale_changed: false,
                    currency_changed: true,
                    timezone_changed: false,
                    date_format_changed: false,
                  });
                },
              },
            )
          }
          disabled={isLoading}
        />
      </ItemActions>
    </Item>
  );
};
