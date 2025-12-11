"use client";

import { Moon, Sun, MonitorCog, ChevronDown, LucideProps } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components";
import { useMounted } from "@mantine/hooks";
import { ForwardRefExoticComponent, RefAttributes, useMemo } from "react";

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
    if (!mounted) return "Light";

    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "Light";
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
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem
          disabled={theme === "light"}
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-3"
        >
          <Sun className="size-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "dark"}
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-3"
        >
          <Moon className="size-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "system"}
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-3"
        >
          <MonitorCog className="size-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
