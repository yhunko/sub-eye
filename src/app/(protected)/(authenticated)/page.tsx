import {
  DashboardNavbar,
  DashboardLayout,
  DashboardContentLoader,
} from "@/features/dashboard";

export default function Home() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <DashboardContentLoader />
    </DashboardLayout>
  );
}
