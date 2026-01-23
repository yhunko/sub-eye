"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("./dashboard-client").then((mod) => mod.DashboardClient),
  { ssr: false },
);

export const DashboardContentLoader = () => {
  return <DashboardClient />;
};
