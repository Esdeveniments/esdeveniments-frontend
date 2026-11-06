import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { isInternalHost } from "@config/index";
import { isDevelopmentHost, normalizeHost } from "@utils/host-validation";

const BLOCKED_IPV4_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
];

const BLOCKED_IPV6_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ["::", 127],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const BLOCKED_ADDRESSES = new BlockList();
for (const [address, prefix] of BLOCKED_IPV4_SUBNETS) {
  BLOCKED_ADDRESSES.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of BLOCKED_IPV6_SUBNETS) {
  BLOCKED_ADDRESSES.addSubnet(address, prefix, "ipv6");
}

/**
 * True for IP addresses outside public unicast space. Matches by range, so
 * every text form of an address (IPv4-mapped IPv6 such as ::ffff:7f00:1 is
 * checked against the IPv4 rules) gets the same answer. Hostnames return
 * false; use isInternalHost for those.
 */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 0) return false;
  return BLOCKED_ADDRESSES.check(address, version === 4 ? "ipv4" : "ipv6");
}

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
    return { isSafe: !isBlockedAddress(hostname) };
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (
      records.length === 0 ||
      records.some(
        (record) =>
          isInternalHost(record.address) || isBlockedAddress(record.address),
      )
    ) {
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
