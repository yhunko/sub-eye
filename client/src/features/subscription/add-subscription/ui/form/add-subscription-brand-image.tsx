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
import { useTranslation } from "react-i18next";
import { BrandfetchPicker } from "../../../../brandfetch";

export const AddSubscriptionBrandImage = () => {
  const { t } = useTranslation("subscription");
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
            <ItemTitle>{t("form.basicInfo.brand.title")}</ItemTitle>
            <ItemDescription className="text-xs">
              {t("form.basicInfo.brand.description")}{" "}
              <a
                href="https://brandfetch.com"
                target="_blank"
                rel="noopener noreferrer"
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
