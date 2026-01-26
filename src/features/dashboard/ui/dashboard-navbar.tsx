"use client";

import { MobileNavigation } from "./navbar/mobile-navigation";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { useMounted } from "@mantine/hooks";

export const DashboardNavbar = () => {
  const mounted = useMounted();
  const isDesktop = useBreakpoint("md");

  if (!mounted) return <MobileNavigation />;

  return isDesktop ? <DesktopNavbar /> : <MobileNavigation />;
};
