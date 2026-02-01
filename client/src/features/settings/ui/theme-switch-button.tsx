"use client";

import { Moon, Sun, MonitorCog, ChevronDown, LucideProps } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components";
import { useMounted } from "@mantine/hooks";
import { ForwardRefExoticComponent, RefAttributes, useMemo } from "react";
import * as m from "@/i18n/messages";
import { useTheme } from "@/app/providers/theme-provider";

export const ThemeSwitchButton = () => {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  > = useMemo(() => {
    if (!mounted) return Sun;

    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      case "system":
        return MonitorCog;
      default:
        return Sun;
    }
  }, [mounted, theme]);

  const getThemeLabel = () => {
    if (!mounted) return m.settings_theme_light();

    switch (theme) {
      case "light":
        return m.settings_theme_light();
      case "dark":
        return m.settings_theme_dark();
      case "system":
        return m.settings_theme_system();
      default:
        return m.settings_theme_light();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between px-4">
          <span className="flex items-center gap-3">
            <Icon className="size-4" />
            <span>{getThemeLabel()}</span>
          </span>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-(--radix-dropdown-menu-trigger-width)"
      >
        <DropdownMenuItem
          disabled={theme === "light"}
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-3"
        >
          <Sun className="size-4" />
          <span>{m.settings_theme_light()}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "dark"}
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-3"
        >
          <Moon className="size-4" />
          <span>{m.settings_theme_dark()}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "system"}
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-3"
        >
          <MonitorCog className="size-4" />
          <span>{m.settings_theme_system()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
