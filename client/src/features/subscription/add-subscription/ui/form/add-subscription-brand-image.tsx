import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  FormField,
  ItemDescription,
  FormMessage,
} from "@/shared/components";
import { useFormContext } from "react-hook-form";
import { AddSubscriptionInput } from "../../model/schema";
import * as m from "@/i18n/messages";
import { BrandfetchPicker } from "@/features/brandfetch";

export const AddSubscriptionBrandImage = () => {
  const { control } = useFormContext<AddSubscriptionInput>();

  return (
    <FormField
      control={control}
      name="brandDomain"
      render={({ field }) => (
        <div className="space-y-2">
          <Item size="sm" variant="outline">
            <ItemMedia>
              <BrandfetchPicker
                value={field.value ?? undefined}
                onChange={field.onChange}
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{m.form_basicInfo_brand_title()}</ItemTitle>
              <ItemDescription className="text-xs">
                {m.form_basicInfo_brand_description()}&nbsp;
                <a
                  href="https://brandfetch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Brandfetch
                </a>
                .
              </ItemDescription>
            </ItemContent>
          </Item>
          <FormMessage />
        </div>
      )}
    />
  );
};
