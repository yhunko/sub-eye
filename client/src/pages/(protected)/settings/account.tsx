import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { SettingsLayout } from "@/widgets/settings-layout";
import {
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { UserProfile } from "@clerk/clerk-react";

export const Route = createFileRoute("/(protected)/settings/account")({
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        className="flex max-w-220 flex-col px-4 md:px-0"
        Breadcrumbs={
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{m.settings_pages_account()}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        }
      >
        <div className="flex justify-center">
          <UserProfile />
        </div>
      </SettingsLayout>
    </DashboardLayout>
  );
}
