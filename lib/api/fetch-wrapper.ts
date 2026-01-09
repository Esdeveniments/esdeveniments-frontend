import { generateHmac } from "@utils/hmac";

export async function fetchWithHmac(
  url: string,
  options: RequestInit & { skipBodySigning?: boolean; timeout?: number } = {}
): Promise<Response> {
  const timestamp = Date.now();
  let bodyToSign = "";
  let normalizedBody: BodyInit | null | undefined = options.body;
  let wasUrlSearchParams = false;

  if (options.body) {
    if (typeof options.body === "string") {
      bodyToSign = options.body;
    } else if (options.body instanceof URLSearchParams) {
      // Convert URLSearchParams to string BEFORE signing and sending.
      // This ensures the client and server see the same string representation.
      bodyToSign = options.body.toString();
      normalizedBody = bodyToSign;
      wasUrlSearchParams = true;
    } else if (options.body instanceof FormData) {
      bodyToSign = "";
    } else {
      // To prevent signature mismatches, we must be explicit about supported body types.
      // The server middleware can only reliably read string bodies (for non-FormData requests).
      // Other types like Blobs or ArrayBuffers would lead to signature failures.
      throw new Error(
        `fetchWithHmac: Unsupported body type. Only string, URLSearchParams, and FormData are supported.`
      );
    }
  }

  if (options.skipBodySigning) {
    bodyToSign = "";
  }

  let urlObject: URL;
  try {
    urlObject = new URL(url);
  } catch {
    throw new Error(
      `[fetchWithHmac] Invalid URL: "${url}". Server-side API calls must use absolute URLs.`
    );
  }
  const pathAndQuery = urlObject.pathname + urlObject.search;

  const method = options.method?.toUpperCase() || "GET";

  const hmac = await generateHmac(bodyToSign, timestamp, pathAndQuery, method);

  const headers = new Headers(options.headers);
  headers.set("x-timestamp", String(timestamp));
  headers.set("x-hmac", hmac);

  // Note: The caller can provide an explicit 'x-visitor-id' header in
  // options.headers when needed (e.g., counting event detail views).

  if (wasUrlSearchParams && !headers.has("content-type")) {
    headers.set(
      "content-type",
      "application/x-www-form-urlencoded;charset=UTF-8"
    );
  }

  // Use the normalized body (URLSearchParams converted to string) to ensure
  // the server middleware reads the exact same string we signed.

  // Always enforce no-store for security when no Next.js cache options are provided
  // This prevents caching of sensitive HMAC-signed requests
  const cacheOption = options.next ? undefined : "no-store";

  // Default 10s timeout for serverless environments (prevents hanging)
  const timeoutMs = options.timeout ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Merge signals if caller provided one
  const signal = options.signal
    ? mergeAbortSignals(options.signal, controller.signal)
    : controller.signal;

  try {
    return await fetch(url, {
      ...options,
      cache: cacheOption,
      method,
      body: normalizedBody,
      headers,
      signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Merges two AbortSignals - aborts when either signal aborts
 */
function mergeAbortSignals(
  signal1: AbortSignal,
  signal2: AbortSignal
): AbortSignal {
  const controller = new AbortController();

  const abort = () => controller.abort();

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
  } else {
    signal1.addEventListener("abort", abort, { once: true });
    signal2.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}
