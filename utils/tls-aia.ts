import { X509Certificate } from "node:crypto";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import tls from "node:tls";
import { fetch as undiciFetch } from "undici";
import { createKeyedCache } from "@lib/api/cache";
import { buildPinnedDnsDispatcher } from "@utils/pinned-dns-dispatcher";
import { getPublicFetchSafety } from "@utils/public-fetch-safety";

// Some servers send only their leaf certificate, without the intermediates.
// Browsers still load them because they fetch the missing issuer from the
// certificate's AIA "CA Issuers" URL; Node does not. These helpers do the same
// fetch, and a fetched issuer is only used once its chain reaches one of Node's
// bundled roots, so verification stays as strict as a normal handshake.
const INCOMPLETE_CHAIN_CODES = new Set([
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);
const MAX_AIA_HOPS = 3;
const MAX_CERT_BYTES = 16_384;
const MAX_CAUSE_DEPTH = 5;
const ONE_DAY_MS = 86_400_000;

const issuerCache = createKeyedCache<string[]>(ONE_DAY_MS, {
  storeEmpty: false,
  maxEntries: 200,
});
let bundledRoots: X509Certificate[] | undefined;

export function isIncompleteChainError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    const { code } = current as NodeJS.ErrnoException;
    if (code && INCOMPLETE_CHAIN_CODES.has(code)) return true;
    current = current.cause;
  }
  return false;
}

function isIssuedBy(cert: X509Certificate, issuer: X509Certificate): boolean {
  return cert.checkIssued(issuer) && cert.verify(issuer.publicKey);
}

function isIssuedByBundledRoot(cert: X509Certificate): boolean {
  bundledRoots ??= tls.rootCertificates.map((pem) => new X509Certificate(pem));
  return bundledRoots.some((root) => isIssuedBy(cert, root));
}

function getCaIssuersUrl(cert: X509Certificate): string | undefined {
  const prefix = "CA Issuers - URI:";
  return cert.infoAccess
    ?.split("\n")
    .find((line) => line.startsWith(`${prefix}http`))
    ?.slice(prefix.length);
}

// Reads the server's leaf certificate. The socket is closed right after the
// handshake and never sends data, so skipping verification here is safe.
function readPeerCertificate(
  hostname: string,
  address: string,
  port: number,
  signal: AbortSignal,
): Promise<X509Certificate> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: address,
      port,
      servername: isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: false,
    });
    const onAbort = () => socket.destroy(new Error("TLS peer read aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerX509Certificate();
      socket.destroy();
      if (cert) resolve(cert);
      else reject(new Error("TLS peer sent no certificate"));
    });
    socket.once("error", reject);
    socket.once("close", () => signal.removeEventListener("abort", onAbort));
  });
}

async function fetchCertificate(
  url: string,
  signal: AbortSignal,
): Promise<X509Certificate | null> {
  const safety = await getPublicFetchSafety(url);
  if (!safety.isSafe) return null;

  const dispatcher = safety.dnsRecords
    ? buildPinnedDnsDispatcher(safety.dnsRecords, true)
    : null;
  const response = await undiciFetch(url, {
    signal,
    redirect: "error",
    ...(dispatcher && { dispatcher }),
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    return null;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > MAX_CERT_BYTES) return null;
    chunks.push(chunk);
  }
  try {
    // DER or PEM. PKCS#7 bundles (.p7c) aren't supported and stop the chase.
    return new X509Certificate(Buffer.concat(chunks));
  } catch {
    return null;
  }
}

async function chaseIssuers(
  leaf: X509Certificate,
  signal: AbortSignal,
): Promise<string[]> {
  const issuers: string[] = [];
  let current = leaf;
  for (let hop = 0; hop < MAX_AIA_HOPS; hop++) {
    if (isIssuedByBundledRoot(current)) return issuers;
    const aiaUrl = getCaIssuersUrl(current);
    if (!aiaUrl) return [];
    const issuer = await fetchCertificate(aiaUrl, signal);
    if (!issuer?.ca || !isIssuedBy(current, issuer)) return [];
    issuers.push(issuer.toString());
    current = issuer;
  }
  return isIssuedByBundledRoot(current) ? issuers : [];
}

/**
 * Returns the PEM intermediates a host failed to send, fetched via AIA and
 * verified up to a bundled root, or [] when they can't be resolved. Results
 * are cached per host for a day.
 */
export async function resolveMissingIssuers(
  targetUrl: string,
  dnsRecords: LookupAddress[],
  signal: AbortSignal,
): Promise<string[]> {
  const { hostname, port } = new URL(targetUrl);
  const address = dnsRecords[0]?.address;
  if (!address) return [];

  return issuerCache.cache(`${hostname}:${port}`, async () => {
    try {
      const leaf = await readPeerCertificate(
        hostname,
        address,
        Number(port) || 443,
        signal,
      );
      return await chaseIssuers(leaf, signal);
    } catch {
      return [];
    }
  });
}
