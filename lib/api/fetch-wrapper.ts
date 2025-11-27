import { generateHmac } from "@utils/hmac";

export async function fetchWithHmac(
  url: string,
  options: RequestInit = {}
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
  // Enforce no-store to prevent caching of authenticated requests (cannot be overridden)
  return fetch(url, {
    ...options,
    cache: "no-store",
    method,
    body: normalizedBody,
    headers,
  });
}
