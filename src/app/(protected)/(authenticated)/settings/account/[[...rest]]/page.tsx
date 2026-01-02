import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SettingsLayout, SettingsTab, SettingsTabs } from "@/features/settings";
import { UserProfile } from "@clerk/nextjs";

export default async function SettingsPageAccount() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        className="flex max-w-full flex-col"
        Tabs={
          <SettingsTabs
            tab={SettingsTab.ACCOUNT}
            className="w-full max-w-xl self-center"
          />
        }
      >
        <div className="flex justify-center">
          <UserProfile />
        </div>
      </SettingsLayout>
    </DashboardLayout>
  );
}
