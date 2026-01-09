import "@clerk/types";

export {}; // This ensures the file is treated as a module

declare global {
  interface UserPublicMetadata {
    preferredCurrency?: number;
    preferredTimezone?: string;
    notificationTime?: string;
    notificationOffset?: number;
    locale?: string;
  }

  interface CustomJwtSessionClaims {
    publicMetadata: UserPublicMetadata;
  }
}
