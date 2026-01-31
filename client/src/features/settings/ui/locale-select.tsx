import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { Languages } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";
import * as m from "@/i18n/messages";

export const LocaleSelect = () => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <Languages />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{m.settings_general_locale_label()}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <LocaleSwitcher />
      </ItemActions>
    </Item>
  );
};
