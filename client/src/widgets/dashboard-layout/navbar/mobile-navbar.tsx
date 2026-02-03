import { DashboardLogo } from "../dashboard-logo";
import { UserDropdownMenu } from "@/features/auth";
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
        className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur md:hidden"
      >
        <DashboardLogo />
        <UserDropdownMenu triggerId="navbar-user-trigger-mobile" />
      </motion.header>
    </LazyMotion>
  );
};
