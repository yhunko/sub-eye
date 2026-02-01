import { FC } from "react";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { SwatchBook } from "lucide-react";
import * as m from "@/i18n/messages";
import { ThemeSwitchButton } from "./theme-switch-button";

export const ThemeSelect: FC = () => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <SwatchBook />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{m.settings_general_theme_label()}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <ThemeSwitchButton />
      </ItemActions>
    </Item>
  );
};
