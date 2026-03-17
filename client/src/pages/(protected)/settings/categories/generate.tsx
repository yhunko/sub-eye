import { createFileRoute } from "@tanstack/react-router";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { CategoryAiGenerator } from "@/features/category/ai-generator/category-ai-generator";
import * as m from "@/i18n/messages";

export const Route = createFileRoute(
  "/(protected)/settings/categories/generate",
)({
  component: SettingsCategoriesGeneratePage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsCategoriesGeneratePage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout
      title={m.categories_ai_page_title()}
      backTo="/settings/categories"
      backToSearch={{ from }}
    >
      <SettingsFormLayout>
        <CategoryAiGenerator />
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
