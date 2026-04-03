import {
  decodeBase64ToBytes,
  encodeBytesToBase64,
  normalizeBase64ForComparison,
} from "@/shared/lib/base64";

export class PushNotificationsUtils {
  static urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const bytes = decodeBase64ToBytes(base64String);

    if (!bytes) {
      throw new Error("Invalid base64 value");
    }

    return new Uint8Array(bytes);
  }

  static arrayBufferToBase64(buffer: ArrayBuffer | null): string | null {
    if (!buffer) return null;

    return encodeBytesToBase64(new Uint8Array(buffer));
  }

  // Compare an ArrayBuffer key with a Base64 string key
  static areKeysEqual(
    serverKeyBuffer: ArrayBuffer | null,
    localKeyBase64: string,
  ): boolean {
    if (!serverKeyBuffer) return false;

    // Convert ArrayBuffer to Base64url format for comparison with VAPID key
    // VAPID keys usually come as base64url (no padding, -_, etc) but let's normalize.

    const serverKeyBase64 =
      PushNotificationsUtils.arrayBufferToBase64(serverKeyBuffer);
    if (!serverKeyBase64) return false;

    // Normalize both strings: remove padding, replace chars to match URL safe or standard
    // Simplest: convert Base64 URL safe to Standard Base64
    return (
      normalizeBase64ForComparison(serverKeyBase64) ===
      normalizeBase64ForComparison(localKeyBase64)
    );
  }
}
