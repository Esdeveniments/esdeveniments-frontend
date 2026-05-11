import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isInternalHost } from "@config/index";
import { isDevelopmentHost, normalizeHost } from "@utils/host-validation";

export async function isSafePublicFetchUrl(
  candidateUrl: string,
  allowDevelopmentHosts = process.env.NODE_ENV !== "production",
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = normalizeHost(parsed.hostname);
  if (allowDevelopmentHosts && isDevelopmentHost(hostname)) {
    return true;
  }

  if (isInternalHost(hostname)) {
    return false;
  }

  if (isIP(hostname)) {
    return true;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.length > 0 && records.every((record) => !isInternalHost(record.address));
  } catch {
    return false;
  }
}