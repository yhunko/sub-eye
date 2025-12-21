import { FC } from "react";
import { ThemeSwitchButton } from "../../theme";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/shared/components";

export const ThemeSelect: FC = () => {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Theme</ItemTitle>
      </ItemContent>
      <ItemActions>
        <ThemeSwitchButton />
      </ItemActions>
    </Item>
  );
};
