import { Agent } from "undici";
import type { LookupAddress } from "node:dns";
import { rootCertificates } from "node:tls";

/**
 * Builds an undici dispatcher whose connections are pinned to a pre-resolved
 * set of DNS records. We resolve the host once (in getPublicFetchSafety) to run
 * SSRF checks, then pin the socket to those exact records so the connection
 * can't be re-pointed at an internal address via DNS rebinding.
 *
 * `extraCa` adds intermediates (PEM) on top of Node's bundled roots.
 *
 * Returns null when there are no records to pin to (caller falls back).
 */
export function buildPinnedDnsDispatcher(
  dnsRecords: LookupAddress[],
  rejectUnauthorized: boolean,
  extraCa?: string[],
): Agent | null {
  const firstRecord = dnsRecords[0];
  if (!firstRecord) return null;

  return new Agent({
    connect: {
      keepAlive: false,
      rejectUnauthorized,
      ...(extraCa?.length && { ca: [...rootCertificates, ...extraCa] }),
      lookup(_hostname, options, callback) {
        // Node's net.connect uses autoSelectFamily (Happy Eyeballs, default
        // since Node 20) and calls lookup with { all: true }, expecting an
        // ARRAY of { address, family } records. Always answering with the
        // single-address signature made every connection fail with
        // "Invalid IP address: undefined" -> all image fetches 502'd.
        if (options?.all) {
          callback(
            null,
            dnsRecords.map(({ address, family }) => ({ address, family })),
          );
        } else {
          callback(null, firstRecord.address, firstRecord.family);
        }
      },
    },
  });
}
