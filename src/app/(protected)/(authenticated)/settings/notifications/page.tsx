import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import {
  SettingsLayout,
  SettingsTabs,
  SettingsTab,
  SettingsNotificationsForm,
} from "@/features/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components";

export default async function SettingsNotificationsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout Tabs={<SettingsTabs tab={SettingsTab.NOTIFICATIONS} />}>
        <Card>
          <CardHeader>
            <CardTitle>Notifications settings</CardTitle>
            <CardDescription>
              Manage your notifications preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsNotificationsForm />
          </CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
