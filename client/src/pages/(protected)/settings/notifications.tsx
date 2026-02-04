import * as m from "@/shared/lib/i18n/messages";
import { SettingsNotificationsForm } from "@/features/push-notifications";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/widgets/settings-layout";

export const Route = createFileRoute("/(protected)/settings/notifications")({
  component: SettingsNotificationsPage,
});

export function SettingsNotificationsPage() {
  return (
    <SettingsLayout title={m.settings_notifications_title()} backTo="/settings">
      <SettingsNotificationsForm />
    </SettingsLayout>
  );
}
