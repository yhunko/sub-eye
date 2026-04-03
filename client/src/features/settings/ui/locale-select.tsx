import { Languages } from "lucide-react";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
import { LocaleSwitcher } from "./locale-switcher";

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
