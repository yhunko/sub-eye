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
    await SecureStore.setItemAsync(key, value);
  },
};
