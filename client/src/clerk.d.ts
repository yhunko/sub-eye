import "@clerk/types";

export {}; // This ensures the file is treated as a module

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }

  interface UserPublicMetadata {
    planId?: "free" | "pro";
    preferredCurrency?: string;
    preferredTimezone?: string;
    notificationTime?: string;
    notificationOffset?: number;
    locale?: string;
    preferredDateFormat?: string;
  }

  interface CustomJwtSessionClaims {
    publicMetadata: UserPublicMetadata;
  }
}
