import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemGroup,
} from "@/shared/components";
import { Cog, ChevronRight, BellRing, User } from "lucide-react";
import * as m from "@/i18n/messages";
import { SettingsLayout } from "@/widgets/settings-layout";
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
  {
    key: m.settings_pages_notifications,
    path: "/settings/notifications",
    Icon: BellRing,
  },
  {
    key: m.settings_pages_account,
    path: "/settings/account",
    Icon: User,
  },
] as const;

function SettingsPage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout title={m.settings_title()} backTo={from}>
      <ItemGroup className="gap-3">
        {pages.map(({ key, path, Icon }) => (
          <Item key={path} variant="outline" size="default" asChild>
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
    </SettingsLayout>
  );
}
