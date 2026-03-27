import { FC } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/shared/assets/logo.svg";
import {
  Button,
  NavigationMenu,
  NavigationMenuList,
  NavItem,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { LayoutDashboard, List } from "lucide-react";

export const DemoNavbar: FC = () => {
  const isDesktop = useBreakpoint("md");
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <header className="bg-card border-border/50 sticky top-0 z-50 border-b px-4">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/demo" className="flex items-center gap-2">
            <img
              alt="SubEye"
              src={Logo}
              className="h-8 w-auto object-contain"
            />
            <span className="text-sm font-semibold tracking-tight">SubEye</span>
            <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              Demo
            </span>
          </Link>

          {isDesktop && (
            <NavigationMenu>
              <NavigationMenuList>
                <NavItem
                  to="/demo"
                  icon={LayoutDashboard}
                  label={m.demo_nav_dashboard()}
                  isActive={pathname === "/demo"}
                />
                <NavItem
                  to="/demo/subscriptions"
                  icon={List}
                  label={m.demo_nav_subscriptions()}
                  isActive={pathname === "/demo/subscriptions"}
                />
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth/sign-up/$">{m.demo_nav_signUp()}</Link>
          </Button>
        </div>
      </div>

      {!isDesktop && (
        <nav className="bg-card border-border/50 fixed right-0 bottom-0 left-0 flex justify-around border-t py-2">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/demo"
              className={`flex flex-col items-center gap-1 ${
                pathname === "/demo" ? "bg-accent" : ""
              }`}
            >
              <LayoutDashboard className="size-5" />
              <span className="text-xs">{m.demo_nav_dashboard()}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/demo/subscriptions"
              className={`flex flex-col items-center gap-1 ${
                pathname === "/demo/subscriptions" ? "bg-accent" : ""
              }`}
            >
              <List className="size-5" />
              <span className="text-xs">{m.demo_nav_subscriptions()}</span>
            </Link>
          </Button>
        </nav>
      )}
    </header>
  );
};
