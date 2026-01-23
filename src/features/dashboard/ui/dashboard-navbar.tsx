import { headers } from "next/headers";
import { userAgent } from "next/server";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { MobileNavigation } from "./navbar/mobile-navigation";

export const DashboardNavbar = async () => {
  const { device } = userAgent({ headers: await headers() });
  const isMobile = device?.type === "mobile";

  return isMobile ? <MobileNavigation /> : <DesktopNavbar />;
};
