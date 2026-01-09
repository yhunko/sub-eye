"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { DashboardLogo } from "../dashboard-logo";
import { UserDropdownMenu } from "../../../auth/ui/user-dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  Button,
  navigationMenuTriggerStyle,
} from "@/shared/components";
import { cn } from "@/shared/lib";
import { useTranslations } from "next-intl";

export const DesktopNavbar = () => {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  return (
    <header className="bg-background/60 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 hidden w-full border-b backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 md:gap-6 md:px-6">
        <div className="flex items-center gap-2">
          <DashboardLogo />
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/subscriptions"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "transition-colors",
                      pathname === "/subscriptions"
                        ? "bg-accent text-accent-foreground pointer-events-none"
                        : "text-muted-foreground hover:text-foreground cursor-pointer bg-transparent",
                    )}
                  >
                    {t("subscriptions")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label={t("addSubscription")}
          >
            <Link href="/subscriptions/add">
              <Plus className="size-5 transition-all" />
              <span className="sr-only">{t("addSubscription")}</span>
            </Link>
          </Button>

          <UserDropdownMenu triggerId="navbar-user-trigger-desktop" />
        </div>
      </div>
    </header>
  );
};
