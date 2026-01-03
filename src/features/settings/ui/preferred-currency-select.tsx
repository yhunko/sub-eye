"use client";

import { FC } from "react";
import {
  Spinner,
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { useUpdateUserPublicMetadata } from "@/entities/user";
import { CurrencySelect } from "../../currency";
import { DollarSign } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

export const PreferredCurrencySelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || !isLoaded;

  return (
    <Item variant="outline">
      <ItemMedia>
        <DollarSign />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          Preferred Currency
          {isLoading && <Spinner />}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <CurrencySelect
          id="preferred-currency"
          value={
            user?.publicMetadata?.preferredCurrency ??
            CurrencyUtils.DEFAULT_CURRENCY_CODE
          }
          onChange={(currency) => mutate({ preferredCurrency: currency })}
          disabled={isLoading}
        />
      </ItemActions>
    </Item>
  );
};
