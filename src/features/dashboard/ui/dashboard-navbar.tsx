"use client";

import * as React from "react";
import { DesktopNavbar } from "./navbar/desktop-navbar";
import { MobileNavigation } from "./navbar/mobile-navigation";

export const DashboardNavbar = () => {
  return (
    <>
      <DesktopNavbar />
      <MobileNavigation />
    </>
  );
};
