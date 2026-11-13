import type { LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { Headers, Response } from "undici";
import { IMAGE_PROXY_USER_AGENT } from "@utils/constants";
import { getErrorChain } from "@utils/error-chain";
import { buildPinnedLookup } from "@utils/pinned-dns-dispatcher";

// Some servers send headers that undici's strict parser (llhttp) rejects, such
// as a Content-Security-Policy value with raw line breaks (biguesiriells.cat).
// Browsers and curl accept them. undici reports the parse error as an
// HTTPParserError (with no code in undici 8) or, when a Content-Length was
// already read, as a content-length mismatch.
const KEPT_HEADERS = ["content-type", "content-length", "location"];
const NULL_BODY_STATUSES = new Set([204, 205, 304]);
// The caller's signal stops covering the body once it has the response.
const SOCKET_IDLE_TIMEOUT_MS = 15_000;

export function isHttpParserError(error: unknown): boolean {
  return getErrorChain(error).some(
    ({ name, code }) =>
      name === "HTTPParserError" ||
      code === "UND_ERR_RES_CONTENT_LENGTH_MISMATCH",
  );
}

/**
 * GET with Node's lenient HTTP parser, on a fresh connection pinned to the
 * SSRF-checked DNS records. Only the headers the image proxy reads are kept,
 * so the malformed ones never leave this function. Doesn't follow redirects.
 */
export function fetchWithLenientParser(
  url: string,
  signal: AbortSignal,
  dnsRecords: LookupAddress[] | undefined,
  rejectUnauthorized: boolean,
): Promise<Response> {
  const client = new URL(url).protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(
      url,
      {
        agent: false,
        headers: { "user-agent": IMAGE_PROXY_USER_AGENT },
        insecureHTTPParser: true,
        rejectUnauthorized,
        signal,
        ...(dnsRecords?.length && { lookup: buildPinnedLookup(dnsRecords) }),
      },
      (upstream) => {
        // Headers and Response reject values the lenient parser lets through
        // (control characters, statuses outside 200-599): fail, don't throw.
        try {
          const status = upstream.statusCode ?? 502;
          const headers = new Headers();
          for (const name of KEPT_HEADERS) {
            const value = upstream.headers[name];
            if (typeof value === "string") headers.set(name, value);
          }
          if (NULL_BODY_STATUSES.has(status)) {
            resolve(new Response(null, { status, headers }));
            upstream.resume();
          } else {
            // An IncomingMessage is an AsyncIterable<Uint8Array> body.
            resolve(new Response(upstream, { status, headers }));
          }
        } catch (error) {
          upstream.destroy();
          reject(error);
        }
      },
    );
    request.setTimeout(SOCKET_IDLE_TIMEOUT_MS, () =>
      request.destroy(new Error("Upstream socket idle timeout")),
    );
    request.once("error", reject);
  });
}
