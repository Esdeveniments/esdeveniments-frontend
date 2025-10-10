import { webcrypto } from "crypto";

// Use crypto.subtle for consistency with middleware
const cryptoSubtle = globalThis.crypto?.subtle || webcrypto.subtle;

// Use the server-only secret. This ensures the secret is never exposed to the browser.
const _hmacSecret = process.env.HMAC_SECRET;
if (!_hmacSecret) {
  throw new Error("HMAC_SECRET environment variable must be set");
}
export const hmacSecret = _hmacSecret;

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export const generateHmac = async (
  body: string,
  timestamp: number,
  pathAndQuery: string
): Promise<string> => {
  const stringToSign = `${body}${timestamp}${pathAndQuery}`;
  const keyBytes = hexToUint8Array(hmacSecret);
  const key = await cryptoSubtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const dataBuffer = new TextEncoder().encode(stringToSign);
  const signatureBuffer = await cryptoSubtle.sign("HMAC", key, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signatureHex;
};

export const validateTimestamp = (timestamp: string): boolean => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const requestTimestamp = parseInt(timestamp, 10);
  return !(
    isNaN(requestTimestamp) ||
    requestTimestamp > now + 60000 ||
    now - requestTimestamp > fiveMinutes
  );
};

export const buildStringToSign = (
  body: string,
  timestamp: string,
  pathname: string,
  search: string
): string => {
  return `${body}${timestamp}${pathname}${search}`;
};

export const verifyHmacSignature = async (
  stringToSign: string,
  signature: string,
  secret: string = hmacSecret
): Promise<boolean> => {
  const keyBytes = hexToUint8Array(secret);
  const key = await cryptoSubtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const dataBuffer = new TextEncoder().encode(stringToSign);
  const expectedSignatureBuffer = await cryptoSubtle.sign(
    "HMAC",
    key,
    dataBuffer
  );
  const expectedSignatureHex = Array.from(
    new Uint8Array(expectedSignatureBuffer)
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedSignatureHex === signature;
};
