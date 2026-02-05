import { SettingsGeneralForm } from "@/features/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";
import { createFileRoute } from "@tanstack/react-router";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";

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
