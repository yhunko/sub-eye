import crypto from "node:crypto";

type VerifyPaddleSignatureInput = {
  payload: string;
  signatureHeader: string | undefined;
  secret: string;
  toleranceSeconds?: number;
};

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export const verifyPaddleSignature = ({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: VerifyPaddleSignatureInput): boolean => {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3);
  const signatures = parts
    .filter((part) => part.startsWith("h1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ts = Number.parseInt(timestamp, 10);

  if (Number.isNaN(ts)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - ts) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}:${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((signature) => {
    try {
      const normalizedSignature = signature.toLowerCase();

      if (!/^[a-f0-9]{64}$/i.test(normalizedSignature)) {
        return false;
      }

      const signatureBuffer = Buffer.from(normalizedSignature, "hex");

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
};
