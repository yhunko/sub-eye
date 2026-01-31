import { FC } from "react";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import * as m from "@/i18n/messages";

export const ThemeSelect: FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Item variant="outline">
      <ItemMedia>{theme === "light" ? <Sun /> : <Moon />}</ItemMedia>
      <ItemContent>
        <ItemTitle>{m.settings_general_theme_label()}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <button
          onClick={toggleTheme}
          className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-1"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? "Dark" : "Light"}
        </button>
      </ItemActions>
    </Item>
  );
};
