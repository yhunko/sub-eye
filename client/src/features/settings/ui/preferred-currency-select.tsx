import { FC } from "react";
import {
  Spinner,
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { useUpdateUserMetadata } from "@/entities/user";
import { CurrencySelect } from "@/entities/currency";
import { DollarSign } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { CurrencyUtils } from "shared";
import * as m from "@/i18n/messages";

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
          onChange={(currency) => mutate({ preferredCurrency: currency })}
          disabled={isLoading}
        />
      </ItemActions>
    </Item>
  );
};
