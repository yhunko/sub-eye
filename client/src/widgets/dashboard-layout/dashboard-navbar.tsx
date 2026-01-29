import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { MobileNavbar } from "./navbar/mobile-navbar";

export const DashboardNavbar = () => {
  const isDesktop = useBreakpoint("md");

  return isDesktop ? <DesktopNavbar /> : <MobileNavbar />;
};
