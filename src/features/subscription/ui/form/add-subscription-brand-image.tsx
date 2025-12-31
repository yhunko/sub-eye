"use client";

import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  FormField,
} from "@/shared/components";
import { BrandfetchPicker } from "../../../brandfetch";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { AddSubscriptionInput } from "../../model/schema";

export const AddSubscriptionBrandImage = () => {
  const { control } = useFormContext<AddSubscriptionInput>();

  return (
    <FormField
      control={control}
      name="brandDomain"
      render={({ field }) => (
        <Item size="sm" variant="outline">
          <ItemMedia>
            <BrandfetchPicker value={field.value} onChange={field.onChange} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Subscription icon</ItemTitle>
            <ItemDescription>
              It will be fetched using{" "}
              <Link
                href="https://brandfetch.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Brandfetch
              </Link>
              .
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
    />
  );
};
