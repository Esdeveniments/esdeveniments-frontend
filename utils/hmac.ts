import { webcrypto } from "crypto";
const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

// Use crypto.subtle for consistency with middleware
const cryptoSubtle = globalThis.crypto?.subtle || webcrypto.subtle;

// Use the server-only secret. This ensures the secret is never exposed to the browser.
const _hmacSecret = process.env.HMAC_SECRET;
if (!_hmacSecret) {
  throw new Error("HMAC_SECRET environment variable must be set");
}
export const hmacSecret = _hmacSecret;

function getHmacKey(secret: string = hmacSecret) {
  let promise = keyCache.get(secret);
  if (!promise) {
    promise = cryptoSubtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    keyCache.set(secret, promise);
  }
  return promise;
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Invalid hex string");
  }

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
  const key = await getHmacKey(hmacSecret);
  const dataBuffer = encoder.encode(stringToSign);
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
  try {
    // Validate signature is valid hex
    if (signature.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
      return false;
    }
    const key = await getHmacKey(secret);
    const dataBuffer = new TextEncoder().encode(stringToSign);
    const signatureBytes = hexToUint8Array(signature) as BufferSource;
    return await cryptoSubtle.verify("HMAC", key, signatureBytes, dataBuffer);
  } catch (error) {
    console.error("Error verifying HMAC signature:", error);
    return false;
  }
};
