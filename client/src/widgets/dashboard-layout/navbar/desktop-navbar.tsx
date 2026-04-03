import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, List, Plus } from "lucide-react";
import { domAnimation, LazyMotion, m as motion } from "motion/react";
import { UserDropdownMenu } from "@/features/auth";
import { SpaceSwitcher } from "@/features/org/space-switcher";
import * as m from "@/i18n/messages";
import {
  Button,
  NavItem,
  NavigationMenu,
  NavigationMenuList,
} from "@/shared/components";
import { DashboardLogo } from "../dashboard-logo";

let hasAnimated = false;

export const DesktopNavbar = () => {
  const pathname = useLocation({
    select: (l) => l.pathname,
  });

  return (
    <LazyMotion features={domAnimation}>
      <motion.header
        initial={hasAnimated ? false : { y: "-100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onAnimationComplete={() => {
          hasAnimated = true;
        }}
        className="bg-background/60 supports-backdrop-filter:bg-background/60 sticky top-1 z-40 mx-auto hidden w-[95vw] rounded-full border-b backdrop-blur md:block"
      >
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 md:gap-6 md:px-6">
          <div className="flex items-center gap-2">
            <DashboardLogo />
            <NavigationMenu>
              <NavigationMenuList>
                <NavItem
                  to="/"
                  icon={LayoutDashboard}
                  label={m.common_home()}
                  isActive={pathname === "/"}
                />
                <NavItem
                  to="/subscriptions"
                  icon={List}
                  label={m.common_subscriptions()}
                  isActive={pathname === "/subscriptions"}
                />
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <SpaceSwitcher />

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
      </motion.header>
    </LazyMotion>
  );
};
