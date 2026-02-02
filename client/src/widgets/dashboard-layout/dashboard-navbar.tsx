import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { lazy } from "react";

const DesktopNavbar = lazy(() =>
  import("./navbar/desktop-navbar").then((module) => ({
    default: module.DesktopNavbar,
  })),
);
const MobileNavbar = lazy(() =>
  import("./navbar/mobile-navbar").then((module) => ({
    default: module.MobileNavbar,
  })),
);

export const DashboardNavbar = () => {
  const isDesktop = useBreakpoint("md");

  return isDesktop ? <DesktopNavbar /> : <MobileNavbar />;
};
