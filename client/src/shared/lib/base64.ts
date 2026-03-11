const normalizeToStandardBase64 = (value: string): string =>
  value.replace(/-/g, "+").replace(/_/g, "/");

const stripBase64Padding = (value: string): string => value.replace(/=+$/g, "");

const addBase64Padding = (value: string): string =>
  value + "=".repeat((4 - (value.length % 4)) % 4);

const bytesToBinary = (bytes: Uint8Array): string => {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return binary;
};

export const encodeBase64Url = (value: string): string =>
  stripBase64Padding(btoa(bytesToBinary(new TextEncoder().encode(value))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

export const decodeBase64Url = (value: string): string | null => {
  try {
    const normalizedValue = addBase64Padding(normalizeToStandardBase64(value));
    const binary = atob(normalizedValue);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

export const decodeBase64ToBytes = (value: string): Uint8Array | null => {
  try {
    const normalizedValue = addBase64Padding(normalizeToStandardBase64(value));
    const binary = atob(normalizedValue);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
};

export const encodeBytesToBase64 = (bytes: Uint8Array): string =>
  btoa(bytesToBinary(bytes));

export const normalizeBase64ForComparison = (value: string): string =>
  stripBase64Padding(normalizeToStandardBase64(value));
