import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import {
  SettingsLayout,
  SettingsTab,
  SettingsAccountForm,
  SettingsTabs,
} from "@/features/settings";
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
      <SettingsLayout Tabs={<SettingsTabs tab={SettingsTab.ACCOUNT} />}>
        <Card>
          <CardHeader>
            <CardTitle>Account settings</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsAccountForm />
          </CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
