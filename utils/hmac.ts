import { createHmac } from "crypto";

// Use the server-only secret. This ensures the secret is never exposed to the browser.
const hmacSecret = process.env.HMAC_SECRET;

export const generateHmac = (
  body: string,
  timestamp: number,
  pathAndQuery: string
): string => {
  if (!hmacSecret) {
    // This will now only be an issue if the secret is missing on the server, which is the correct behavior.
    throw new Error("HMAC_SECRET is not configured on the server.");
  }

  const stringToSign = `${body}${timestamp}${pathAndQuery}`;
  const hmac = createHmac("sha256", hmacSecret);
  hmac.update(stringToSign);
  return hmac.digest("hex");
};
