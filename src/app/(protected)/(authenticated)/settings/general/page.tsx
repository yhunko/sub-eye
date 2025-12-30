import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import {
  SettingsLayout,
  SettingsTab,
  SettingsGeneralForm,
  SettingsTabs,
} from "@/features/settings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components";

export default async function SettingsPageGeneral() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout Tabs={<SettingsTabs tab={SettingsTab.GENERAL} />}>
        <Card>
          <CardHeader>
            <CardTitle>General settings</CardTitle>
            <CardDescription>Manage your preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsGeneralForm />
          </CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
