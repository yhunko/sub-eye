import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { SettingsGeneralForm } from "@/features/settings";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";

export const Route = createFileRoute("/(protected)/settings/general")({
  component: SettingsGeneralPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsGeneralPage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout
      title={m.settings_general_title()}
      backTo="/settings"
      backToSearch={{ from }}
    >
      <SettingsFormLayout>
        <Card>
          <CardHeader>
            <CardTitle>{m.settings_general_form_title()}</CardTitle>
            <CardDescription>{m.settings_general_subtitle()}</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsGeneralForm />
          </CardContent>
        </Card>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
