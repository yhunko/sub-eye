import { DashboardLogo } from "../dashboard-logo";
import { UserDropdownMenu } from "@/features/auth";
import { SpaceSwitcher } from "@/features/org/space-switcher";
import { LazyMotion, m as motion, domAnimation } from "motion/react";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, List } from "lucide-react";
import { Button } from "@/shared/components";
import * as m from "@/i18n/messages";

let hasAnimated = false;

export const MobileNavbar = () => {
  const pathname = useLocation({
    select: (l) => l.pathname,
  });

  return (
    <>
      <LazyMotion features={domAnimation}>
        <motion.header
          initial={hasAnimated ? false : { y: "-100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onAnimationComplete={() => {
            hasAnimated = true;
          }}
          className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-1 z-40 mx-auto flex h-14 w-[95vw] items-center justify-between rounded-full border-b px-4 backdrop-blur md:hidden"
        >
          <DashboardLogo />
          <div className="flex items-center gap-2">
            <SpaceSwitcher />
            <UserDropdownMenu triggerId="navbar-user-trigger-mobile" />
          </div>
        </motion.header>
      </LazyMotion>

      <nav className="bg-background/80 supports-backdrop-filter:bg-background/60 fixed right-0 bottom-0 left-0 z-40 flex justify-around border-t py-2 backdrop-blur md:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 ${
              pathname === "/" ? "bg-accent" : ""
            }`}
          >
            <LayoutDashboard className="size-5" />
            <span className="text-xs">{m.common_home()}</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/subscriptions"
            className={`flex flex-col items-center gap-1 ${
              pathname === "/subscriptions" ? "bg-accent" : ""
            }`}
          >
            <List className="size-5" />
            <span className="text-xs">{m.common_subscriptions()}</span>
          </Link>
        </Button>
      </nav>
    </>
  );
};
