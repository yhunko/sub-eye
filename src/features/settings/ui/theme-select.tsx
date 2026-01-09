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
import { useTranslations } from "next-intl";

export const ThemeSelect: FC = () => {
  const t = useTranslations("settings.general.theme");

  return (
    <Item variant="outline">
      <ItemMedia>
        <SwatchBook />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t("label")}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <ThemeSwitchButton />
      </ItemActions>
    </Item>
  );
};
