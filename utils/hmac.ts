import { webcrypto } from "crypto";
const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

// Use crypto.subtle for consistency with middleware
const cryptoSubtle = globalThis.crypto?.subtle || webcrypto.subtle;

// Use the server-only secret. This ensures the secret is never exposed to the browser.
function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    throw new Error("HMAC_SECRET environment variable must be set");
  }
  return secret;
}

function getHmacKey(secret: string = getHmacSecret()) {
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
  const key = await getHmacKey();
  const dataBuffer = encoder.encode(stringToSign);
  const signatureBuffer = await cryptoSubtle.sign("HMAC", key, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signatureHex;
};

export const validateTimestamp = (timestamp: string): boolean => {
  // Define tolerance constants for timestamp validation
  const clockSkewTolerance = 5 * 60 * 1000; // 5 minutes tolerance for past timestamps
  const futureTolerance = 60000; // 1 minute tolerance for future timestamps to account for clock skew

  // Parse the timestamp string to a number
  const requestTimestamp = parseInt(timestamp, 10);

  // Early return if parsing failed
  if (isNaN(requestTimestamp)) {
    return false;
  }

  const now = Date.now();

  // Early return if timestamp is too far in the future
  if (requestTimestamp > now + futureTolerance) {
    return false;
  }

  // Early return if timestamp is too old
  if (now - requestTimestamp > clockSkewTolerance) {
    return false;
  }

  // Timestamp is valid
  return true;
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
  secret: string = getHmacSecret()
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
