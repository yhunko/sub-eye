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
import {
  useUpdateUserPublicMetadata,
  useUserPublicMetadata,
} from "@/entities/user";
import { CurrencySelect } from "../../currency";
import { DollarSign } from "lucide-react";

export const PreferredCurrencySelect: FC = () => {
  const { data: publicMetadata, isLoading: isPublicMetadataLoading } =
    useUserPublicMetadata();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || isPublicMetadataLoading;

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
          value={publicMetadata?.preferredCurrency}
          onChange={(currency) => mutate({ preferredCurrency: currency })}
          disabled={isLoading}
        />
      </ItemActions>
    </Item>
  );
};
