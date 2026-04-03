import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { SettingsNotificationsForm } from "@/features/push-notifications";
import * as m from "@/shared/lib/i18n/messages";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { SettingsLayout } from "@/widgets/settings-layout";

export const Route = createFileRoute("/(protected)/settings/notifications")({
  component: SettingsNotificationsPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

export function SettingsNotificationsPage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout
      title={m.settings_notifications_title()}
      backTo="/settings"
      backToSearch={{ from }}
    >
      <SettingsNotificationsForm />
    </SettingsLayout>
  );
}
