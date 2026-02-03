import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { lazy, Suspense } from "react";

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
const MobileBottomNav = lazy(() => import("../mobile-bottom-nav"));

export const DashboardNavbar = () => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return (
      <Suspense>
        <DesktopNavbar />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <MobileNavbar />
      <MobileBottomNav />
    </Suspense>
  );
};
