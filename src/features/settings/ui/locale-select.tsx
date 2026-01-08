import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { Languages } from "lucide-react";
import { LocaleSwitcher } from "../../i18n";
import { useTranslations } from "next-intl";

export const LocaleSelect = () => {
  const t = useTranslations("settings.general.locale");

  return (
    <Item variant="outline">
      <ItemMedia>
        <Languages />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t("label")}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <LocaleSwitcher />
      </ItemActions>
    </Item>
  );
};
