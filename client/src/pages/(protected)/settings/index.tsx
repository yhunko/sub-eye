import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemGroup,
} from "@/shared/components";
import { Cog, ChevronRight } from "lucide-react";
import * as m from "@/i18n/messages";
import { SettingsLayout } from "@/widgets/settings-layout";
import { ProfileCard } from "../../../features/settings";

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
] as const;

function SettingsPage() {
  return (
    <SettingsLayout title={m.settings_title()}>
      <ProfileCard />
      <Card className="mx-auto w-full max-w-lg gap-2">
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
    </SettingsLayout>
  );
}
