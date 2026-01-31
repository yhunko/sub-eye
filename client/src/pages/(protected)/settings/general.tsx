import { SettingsGeneralForm } from "@/features/settings";
import {
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";
import { SettingsLayout } from "@/widgets/settings-layout";
import { createFileRoute } from "@tanstack/react-router";
import * as m from "@/i18n/messages";

export const Route = createFileRoute("/(protected)/settings/general")({
  component: SettingsGeneralPage,
});

function SettingsGeneralPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        Breadcrumbs={
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{m.settings_pages_general()}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{m.settings_general_title()}</CardTitle>
            <CardDescription>{m.settings_general_subtitle()}</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsGeneralForm />
          </CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
