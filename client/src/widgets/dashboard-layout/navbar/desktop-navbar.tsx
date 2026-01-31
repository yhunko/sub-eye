import { UserDropdownMenu } from "@/features/auth";
import { DashboardLogo } from "../dashboard-logo";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "../../../shared/lib/classes-utils";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
  Button,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { Plus } from "lucide-react";

export const DesktopNavbar = () => {
  const pathname = useLocation({
    select: (l) => l.pathname,
  });

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
                    to="/subscriptions"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "transition-colors",
                      pathname === "/subscriptions"
                        ? "bg-accent text-accent-foreground pointer-events-none"
                        : "text-muted-foreground hover:text-foreground cursor-pointer bg-transparent",
                    )}
                  >
                    {m.common_subscriptions()}
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
            aria-label={m.common_add()}
          >
            <Link to="/subscriptions/add">
              <Plus className="size-6 transition-all" />
              <span className="sr-only">{m.common_add()}</span>
            </Link>
          </Button>

          <UserDropdownMenu triggerId="navbar-user-trigger-desktop" />
        </div>
      </div>
    </header>
  );
};
