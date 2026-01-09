import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SettingsLayout, SettingsNotificationsForm } from "@/features/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/shared/components";
import { getTranslations } from "next-intl/server";

export default async function SettingsNotificationsPage() {
  const t = await getTranslations("settings");

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        Breadcrumbs={
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("pages.notifications")}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("notifications.title")}</CardTitle>
            <CardDescription>{t("notifications.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsNotificationsForm />
          </CardContent>
        </Card>
      </SettingsLayout>
    </DashboardLayout>
  );
}
