import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SettingsLayout } from "@/features/settings";
import { UserProfile } from "@clerk/nextjs";
import {
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/shared/components";
import { getTranslations } from "next-intl/server";

export default async function SettingsPageAccount() {
  const t = await getTranslations("settings");

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SettingsLayout
        className="flex max-w-[880px] flex-col px-4 md:px-0"
        Breadcrumbs={
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("pages.account")}</BreadcrumbPage>
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
