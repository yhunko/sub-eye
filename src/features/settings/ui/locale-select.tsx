import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { Languages } from "lucide-react";
import { LocaleSwitcher } from "../../i18n";

export const LocaleSelect = () => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <Languages />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Locale</ItemTitle>
      </ItemContent>
      <ItemActions>
        <LocaleSwitcher />
      </ItemActions>
    </Item>
  );
};
