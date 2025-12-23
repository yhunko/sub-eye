import { FC } from "react";
import { ThemeSwitchButton } from "../../theme";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { SwatchBook } from "lucide-react";

export const ThemeSelect: FC = () => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <SwatchBook />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Theme</ItemTitle>
      </ItemContent>
      <ItemActions>
        <ThemeSwitchButton />
      </ItemActions>
    </Item>
  );
};
