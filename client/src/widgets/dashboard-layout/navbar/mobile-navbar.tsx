import { DashboardLogo } from "../dashboard-logo";
import { UserDropdownMenu } from "@/features/auth";
import { SpaceSwitcher } from "@/features/org/space-switcher";
import { LazyMotion, m as motion, domAnimation } from "motion/react";

let hasAnimated = false;

export const MobileNavbar = () => {
  return (
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
  );
};
