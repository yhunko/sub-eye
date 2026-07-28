import * as SecureStore from "expo-secure-store";

// Clerk session persistence, backed by the device keychain (iOS) / keystore
// (Android). A value that fails to decrypt — e.g. after a keychain reset or an
// OS restore — must NOT brick sign-in: drop it and let the user re-auth.
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key).catch(() => {});
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Clerk awaits this during its own load, so a keychain write that throws
      // — a locked device, a restored backup, a missing entitlement — rejects
      // inside the handshake and `isLoaded` never flips. That costs the whole
      // app, silently, to save a token that only buys session persistence.
      // Losing it means signing in again; not catching it means never at all.
    }
  },
};
