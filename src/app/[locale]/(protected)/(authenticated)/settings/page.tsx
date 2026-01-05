import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
  CardContent,
  Card,
  CardTitle,
  CardHeader,
  ItemGroup,
} from "@/shared/components";
import { Link } from "@/features/i18n/lib/navigation";
import { getTranslations } from "next-intl/server";
import { Cog, BellRing, UserRound, ChevronRight } from "lucide-react";

const settingsPages = [
  {
    key: "pages.general",
    path: "/settings/general",
    Icon: Cog,
  },
  {
    key: "pages.notifications",
    path: "/settings/notifications",
    Icon: BellRing,
  },
  {
    key: "pages.account",
    path: "/settings/account",
    Icon: UserRound,
  },
];

export default async function Settings() {
  const t = await getTranslations("settings");

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Card className="mx-auto max-w-lg gap-2">
        <CardHeader className="px-6">
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ItemGroup>
            {settingsPages.map(({ key, path, Icon }) => (
              <Item key={path} size="sm" asChild>
                <Link href={path} passHref>
                  <ItemMedia variant="icon">
                    <Icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t(key)}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight className="size-4" />
                  </ItemActions>
                </Link>
              </Item>
            ))}
          </ItemGroup>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
