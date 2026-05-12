import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isInternalHost } from "@config/index";
import { isDevelopmentHost, normalizeHost } from "@utils/host-validation";

export async function getPublicFetchSafety(
  candidateUrl: string,
  allowDevelopmentHosts = process.env.NODE_ENV === "development",
) {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return { isSafe: false };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isSafe: false };
  }

  if (parsed.username || parsed.password) {
    return { isSafe: false };
  }

  const hostname = normalizeHost(parsed.hostname);
  if (allowDevelopmentHosts && isDevelopmentHost(hostname)) {
    return { isSafe: true };
  }

  if (isInternalHost(hostname)) {
    return { isSafe: false };
  }

  if (isIP(hostname)) {
    return { isSafe: true };
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0 || records.some((record) => isInternalHost(record.address))) {
      return { isSafe: false };
    }
    return { isSafe: true, dnsRecords: records };
  } catch {
    return { isSafe: false };
  }
}

export async function isSafePublicFetchUrl(
  candidateUrl: string,
  allowDevelopmentHosts = process.env.NODE_ENV === "development",
): Promise<boolean> {
  const safety = await getPublicFetchSafety(candidateUrl, allowDevelopmentHosts);
  return safety.isSafe;
}
