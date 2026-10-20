import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const TOKEN_ENVELOPE_PREFIX = "v1.";

export function sealToken(value: string, key: Buffer, context = ""): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  if (context) cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return TOKEN_ENVELOPE_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openToken(value: string, key: Buffer, context = ""): string {
  if (!value.startsWith(TOKEN_ENVELOPE_PREFIX)) throw new Error("Invalid token envelope");
  const data = Buffer.from(value.slice(TOKEN_ENVELOPE_PREFIX.length), "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  if (context) decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
