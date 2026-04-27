import "@clerk/types";

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }

  interface UserPublicMetadata {
    planId?: "free" | "plus";
    preferredCurrency?: string;
    preferredTimezone?: string;
    notificationTime?: string;
    notificationOffset?: number;
    expiryNotificationsEnabled?: boolean;
    expiryNotificationIntervals?: number[];
    locale?: string;
    preferredDateFormat?: string;
  }

  interface CustomJwtSessionClaims {
    publicMetadata: UserPublicMetadata;
  }
}
