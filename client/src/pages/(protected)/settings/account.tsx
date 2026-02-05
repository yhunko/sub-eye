import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/widgets/settings-layout";
import * as m from "@/i18n/messages";
import { UserProfile } from "@clerk/clerk-react";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";

export const Route = createFileRoute("/(protected)/settings/account")({
  component: SettingsAccountPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsAccountPage() {
  const { from } = Route.useSearch();

  return (
    <SettingsLayout
      title={m.settings_pages_account()}
      backTo="/settings"
      backToSearch={{ from }}
    >
      <div className="h-full grow self-center">
        <UserProfile />
      </div>
    </SettingsLayout>
  );
}
