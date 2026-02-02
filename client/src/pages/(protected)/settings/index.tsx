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
import { UserProfileCard } from "../../../features/settings";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { object, optional, string } from "valibot";

const settingsSearchSchema = object({
  from: optional(string()),
});

export const Route = createFileRoute("/(protected)/settings/")({
  component: SettingsPage,
  validateSearch: valibotValidator(settingsSearchSchema),
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
  const { from } = Route.useSearch();

  return (
    <SettingsLayout title={m.settings_title()} backTo={from}>
      <UserProfileCard />
      <Card className="mx-auto w-full max-w-xl gap-2 py-1">
        <CardContent className="px-2">
          <ItemGroup>
            {pages.map(({ key, path, Icon }) => (
              <Item key={path} size="default" asChild>
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
