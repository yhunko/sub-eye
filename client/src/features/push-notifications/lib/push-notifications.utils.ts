export class PushNotificationsUtils {
  static urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  static arrayBufferToBase64(buffer: ArrayBuffer | null): string | null {
    if (!buffer) return null;
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Compare an ArrayBuffer key with a Base64 string key
  static areKeysEqual(
    serverKeyBuffer: ArrayBuffer | null,
    localKeyBase64: string,
  ): boolean {
    if (!serverKeyBuffer) return false;

    // Convert ArrayBuffer to Base64url format for comparison with VAPID key
    // VAPID keys usually come as base64url (no padding, -_, etc) but let's normalize.

    const serverKeyBase64 = this.arrayBufferToBase64(serverKeyBuffer);
    if (!serverKeyBase64) return false;

    // Normalize both strings: remove padding, replace chars to match URL safe or standard
    // Simplest: convert Base64 URL safe to Standard Base64
    const normalize = (str: string) =>
      str.replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");

    return normalize(serverKeyBase64) === normalize(localKeyBase64);
  }
}
