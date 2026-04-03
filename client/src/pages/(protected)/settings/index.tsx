import { createFileRoute, Link } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import {
  BellRing,
  ChevronRight,
  Cog,
  CreditCard,
  Tag,
  User,
  Users,
} from "lucide-react";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { SettingsLayout } from "@/widgets/settings-layout";

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
    key: m.settings_pages_categories,
    path: "/settings/categories",
    Icon: Tag,
  },
  {
    key: m.settings_pages_billing,
    path: "/settings/billing",
    Icon: CreditCard,
  },
  {
    key: m.settings_pages_account,
    path: "/settings/account",
    Icon: User,
  },
  {
    key: m.family_settings_title,
    path: "/settings/group",
    Icon: Users,
  },
] as const;

function SettingsPage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout title={m.settings_title()} backTo={from} showVersion>
      <ItemGroup className="gap-3">
        {pages.map(({ key, path, Icon }) => (
          <Item key={path} variant="outline" size="default" asChild>
            <Link to={path} search={{ from }}>
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
