import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SettingsLayout, SettingsTab } from "@/features/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components";

export default async function SettingsPageAccount() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout tab={SettingsTab.ACCOUNT}>
        <Card>
          <CardHeader>
            <CardTitle>Account settings</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>ACCOUNT</CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
