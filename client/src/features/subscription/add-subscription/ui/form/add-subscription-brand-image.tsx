import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  FormField,
  ItemDescription,
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
        <Item size="sm" variant="outline">
          <ItemMedia>
            <BrandfetchPicker value={field.value} onChange={field.onChange} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{m.form_basicInfo_brand_title()}</ItemTitle>
            <ItemDescription className="text-xs">
              {m.form_basicInfo_brand_description()}{" "}
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
      )}
    />
  );
};
