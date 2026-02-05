import { NotificationsButton } from "./notifications-button";
import { NotificationsStatus } from "./notifications-status";
import { NotificationTimeSelect } from "./notification-time-select";

export const SettingsNotificationsForm = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <NotificationsStatus />
        <NotificationsButton />
      </div>

      <div className="space-y-4">
        <NotificationTimeSelect />
      </div>
    </div>
  );
};
