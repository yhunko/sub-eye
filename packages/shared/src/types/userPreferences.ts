export type UserPreferences = {
  preferredCurrency: string;
  preferredTimezone: string;
  notificationTime: string;
  notificationOffset: number;
  expiryNotificationsEnabled: boolean;
  expiryNotificationIntervals: number[];
  locale: string;
};
