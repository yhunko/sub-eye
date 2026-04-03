import { Link, useLocation } from "@tanstack/react-router";
import { CreditCard, LayoutDashboard, Plus } from "lucide-react";
import { domAnimation, LazyMotion, m as motion } from "motion/react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { Button } from "../../shared/components";
import { cn } from "../../shared/lib/classes-utils";

let hasAnimated = false;

const MobileBottomNav: FC = () => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const navItems = [
    {
      label: m.common_home(),
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      label: m.common_add(),
      href: "/subscriptions/add",
      icon: Plus,
      isPrimary: true, // Special styling for the action button
    },
    {
      label: m.common_subscriptions(),
      href: "/subscriptions",
      icon: CreditCard,
      isActive: pathname === "/subscriptions",
    },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <motion.nav
        initial={hasAnimated ? false : { y: "150%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onAnimationComplete={() => {
          hasAnimated = true;
        }}
        className="bg-background/80 supports-backdrop-filter:bg-background/40 pb-safe fixed right-2 bottom-4 left-2 z-50 block rounded-full border border-t backdrop-blur-xs sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 md:hidden"
      >
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
      </motion.nav>
    </LazyMotion>
  );
};

export default MobileBottomNav;
