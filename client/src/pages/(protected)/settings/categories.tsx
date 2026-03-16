import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { Plus } from "lucide-react";

export const Route = createFileRoute("/(protected)/settings/categories")({
  component: SettingsCategoriesPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsCategoriesPage() {
  const { from } = Route.useSearch();
  const [showForm, setShowForm] = useState(false);

  return (
    <SettingsLayout
      title={m.settings_pages_categories()}
      backTo="/settings"
      backToSearch={{ from }}
      rightAction={
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="rounded-full bg-gray-500/10 backdrop-blur-md"
          onClick={() => setShowForm((v) => !v)}
          aria-label={m.categories_action_add()}
        >
          <Plus className="size-5" />
        </Button>
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
              showForm={showForm}
              onFormClose={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
