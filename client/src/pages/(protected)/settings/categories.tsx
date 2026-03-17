import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from "@/shared/components";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { ManageCategoriesList } from "@/features/category/manage-categories/manage-categories-list";
import { Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/(protected)/settings/categories")({
  component: SettingsCategoriesPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsCategoriesPage() {
  const { from } = Route.useSearch();
  const { pathname } = useLocation();
  const [showForm, setShowForm] = useState(false);

  if (pathname === "/settings/categories/generate") {
    return <Outlet />;
  }

  return (
    <SettingsLayout
      title={m.settings_pages_categories()}
      backTo="/settings"
      backToSearch={{ from }}
      rightAction={
        <div className="flex items-center gap-2">
          <Button
            asChild
            type="button"
            size="icon-lg"
            className="rounded-full border-cyan-400/40 backdrop-blur-md"
            aria-label={m.categories_ai_page_title()}
          >
            <Link to="/settings/categories/generate" search={{ from }}>
              <Sparkles className="size-5" />
            </Link>
          </Button>
          <Button
            type="button"
            size="icon-lg"
            className="rounded-full backdrop-blur-md"
            onClick={() => setShowForm((v) => !v)}
            aria-label={m.categories_action_add()}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      }
    >
      <SettingsFormLayout>
        <Card>
          <CardHeader>
            <CardTitle>{m.categories_title()}</CardTitle>
            <CardDescription>
              {m.categories_empty_description()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManageCategoriesList
              from={from}
              showForm={showForm}
              onFormOpen={() => setShowForm(true)}
              onFormClose={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
