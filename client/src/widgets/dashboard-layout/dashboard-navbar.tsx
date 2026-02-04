import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { MobileNavbar } from "./navbar/mobile-navbar";
import MobileBottomNav from "../mobile-bottom-nav";

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
