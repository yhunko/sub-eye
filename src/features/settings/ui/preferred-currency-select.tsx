"use client";

import { FC } from "react";
import { Field, FieldLabel, Spinner } from "@/shared/components";
import { useUser } from "@clerk/nextjs";
import { useUpdateUserPublicMetadata } from "@/entities/user";
import { CurrencySelect } from "../../currency";

export const PreferredCurrencySelect: FC = () => {
  const { user, isLoaded } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const isLoading = isPending || !isLoaded;

  return (
    <Field>
      <FieldLabel htmlFor="preferred-currency">
        Preferred Currency
        {isLoading && <Spinner />}
      </FieldLabel>
      <CurrencySelect
        id="preferred-currency"
        value={user?.publicMetadata.preferredCurrency as number | undefined}
        onChange={(currency) => mutate({ preferredCurrency: currency })}
        disabled={isLoading}
      />
    </Field>
  );
};
