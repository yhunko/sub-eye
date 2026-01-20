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
import { useTranslations } from "next-intl";

export const PreferredCurrencySelect: FC = () => {
  const t = useTranslations("settings.general.currency");
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

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
          {t("label")}
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
