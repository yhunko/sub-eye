import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/widgets/settings-layout";
import * as m from "@/i18n/messages";
import { UserProfile } from "@clerk/clerk-react";

export const Route = createFileRoute("/(protected)/settings/account")({
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  return (
    <SettingsLayout title={m.settings_pages_account()} backTo="/settings">
      <div className="h-full grow self-center">
        <UserProfile />
      </div>
    </SettingsLayout>
  );
}
