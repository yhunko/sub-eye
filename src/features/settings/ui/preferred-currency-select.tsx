"use client";

import { FC } from "react";
import { Field, FieldLabel, Spinner } from "@/shared/components";
import {
  useUpdateUserPublicMetadata,
  useUserPublicMetadata,
} from "@/entities/user";
import { CurrencySelect } from "../../currency";

export const PreferredCurrencySelect: FC = () => {
  const { data: publicMetadata, isLoading: isPublicMetadataLoading } =
    useUserPublicMetadata();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || isPublicMetadataLoading;

  return (
    <Field>
      <FieldLabel htmlFor="preferred-currency">
        Preferred Currency
        {isLoading && <Spinner />}
      </FieldLabel>
      <CurrencySelect
        id="preferred-currency"
        value={publicMetadata?.preferredCurrency}
        onChange={(currency) => mutate({ preferredCurrency: currency })}
        disabled={isLoading}
      />
    </Field>
  );
};
