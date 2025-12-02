"use client";

import * as React from "react";
import { Moon, Sun, SunMoon, MonitorCog } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/shared//components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components";

export const ThemeSwitchButton = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <SunMoon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={theme === "light"}
          onClick={() => setTheme("light")}
        >
          <Sun />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "dark"}
          onClick={() => setTheme("dark")}
        >
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={theme === "system"}
          onClick={() => setTheme("system")}
        >
          <MonitorCog />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
