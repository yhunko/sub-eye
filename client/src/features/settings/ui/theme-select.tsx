import { SwatchBook } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
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
