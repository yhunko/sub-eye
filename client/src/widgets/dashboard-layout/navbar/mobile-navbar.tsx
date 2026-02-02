import { DashboardLogo } from "../dashboard-logo";
import { UserDropdownMenu } from "@/features/auth";
import { MobileBottomNav } from "../../mobile-bottom-nav";

export const MobileNavbar = () => {
  return (
    <>
      <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <DashboardLogo />
        <UserDropdownMenu triggerId="navbar-user-trigger-mobile" />
      </header>

      <MobileBottomNav />
    </>
  );
};
