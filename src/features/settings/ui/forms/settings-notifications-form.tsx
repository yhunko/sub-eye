import { NotificationsButton } from "../notifications-button";
import { NotificationsStatus } from "../notifications-status";

export const SettingsNotificationsForm = () => {
  return (
    <div className="space-y-5">
      <NotificationsStatus />

      <NotificationsButton />
    </div>
  );
};
