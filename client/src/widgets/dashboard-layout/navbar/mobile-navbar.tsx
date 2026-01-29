"use client";

import { LayoutDashboard, Plus, CreditCard } from "lucide-react";
import { DashboardLogo } from "../dashboard-logo";
import { Button } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { useLocation, Link } from "@tanstack/react-router";
import { UserDropdownMenu } from "@/features/auth";

export const MobileNavbar = () => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const navItems = [
    {
      // label: t("home"),
      label: "Home",
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      // label: t("add"),
      label: "Add",
      href: "/subscriptions/add",
      icon: Plus,
      isPrimary: true, // Special styling for the action button
    },
    {
      // label: t("subscriptions"),
      label: "Subscriptions",
      href: "/subscriptions",
      icon: CreditCard,
      isActive: pathname === "/subscriptions",
    },
  ];

  return (
    <>
      <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <DashboardLogo />
        <UserDropdownMenu triggerId="navbar-user-trigger-mobile" />
      </header>

      <nav className="bg-background/80 supports-backdrop-filter:bg-background/60 pb-safe fixed right-0 bottom-0 left-0 z-50 block border-t backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isPrimary) {
              return (
                <div key={item.href} className="relative -top-5">
                  <Button
                    asChild
                    size="icon"
                    className="size-12 rounded-full shadow-lg"
                    aria-label={item.label}
                  >
                    <Link to={item.href}>
                      <Icon className="size-6" />
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </Button>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors",
                  item.isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
