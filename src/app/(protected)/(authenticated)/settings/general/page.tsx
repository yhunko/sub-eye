import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import { SettingsLayout, SettingsGeneralForm } from "@/features/settings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/shared/components";
import { getTranslations } from "next-intl/server";

export default async function SettingsPageGeneral() {
  const t = await getTranslations("settings");

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        Breadcrumbs={
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("pages.general")}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        }
      >
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
