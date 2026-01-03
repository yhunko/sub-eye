import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components";
import { NotificationsButton } from "../notifications-button";
import { NotificationsStatus } from "../notifications-status";

export const SettingsNotificationsForm = () => {
  return (
    <div className="space-y-5">
      <NotificationsStatus />

      <NotificationsButton />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Coming soon: Schedule and timing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <ul className="list-inside list-disc space-y-1">
            <li>Notification delivery time (e.g., 10:00 AM)</li>
            <li>Notification offset (e.g., day before, on the day)</li>
            <li>Quiet hours configuration</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
