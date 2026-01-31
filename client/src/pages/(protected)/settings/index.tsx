import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemGroup,
} from "@/shared/components";
import { Cog, UserRound, ChevronRight } from "lucide-react";
import * as m from "@/i18n/messages";

export const Route = createFileRoute("/(protected)/settings/")({
  component: SettingsPage,
});

const pages = [
  { key: m.settings_pages_general, path: "/settings/general", Icon: Cog },
  // {
  //   key: m.settings_pages_notifications,
  //   path: "/settings/notifications",
  //   Icon: BellRing,
  // },
  { key: m.settings_pages_account, path: "/settings/account", Icon: UserRound },
] as const;

function SettingsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Card className="mx-auto max-w-lg gap-2">
        <CardHeader className="px-6">
          <CardTitle>{m.settings_title()}</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ItemGroup>
            {pages.map(({ key, path, Icon }) => (
              <Item key={path} size="sm" asChild>
                <Link to={path}>
                  <ItemMedia variant="icon">
                    <Icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{key()}</ItemTitle>
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
