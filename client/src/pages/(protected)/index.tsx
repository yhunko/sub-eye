import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";

export const Route = createFileRoute("/(protected)/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Outlet />
    </DashboardLayout>
  );
}
