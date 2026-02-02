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

export const Route = createFileRoute("/(protected)/settings/general")({
  component: SettingsGeneralPage,
});

function SettingsGeneralPage() {
  return (
    <SettingsLayout title={m.settings_general_title()} backTo="/settings">
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
