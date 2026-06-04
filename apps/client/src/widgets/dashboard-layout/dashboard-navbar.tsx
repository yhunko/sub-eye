import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import MobileBottomNav from "../mobile-bottom-nav";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { MobileNavbar } from "./navbar/mobile-navbar";

export const DashboardNavbar = () => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return <DesktopNavbar />;
  }

  return (
    <>
      <MobileNavbar />
      <MobileBottomNav />
    </>
  );
};
