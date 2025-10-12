import { generateHmac } from "utils/hmac";

export async function fetchWithHmac(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const timestamp = Date.now();
  let bodyToSign = "";

  if (options.body && typeof options.body === "string") {
    bodyToSign = options.body;
  }
  // For other body types like FormData, we won't include them in the signature.
  // The server-side middleware must have matching logic.

  let urlObject: URL;
  try {
    urlObject = new URL(url);
  } catch {
    throw new Error(
      `[fetchWithHmac] Invalid URL: "${url}". Server-side API calls must use absolute URLs.`
    );
  }
  const pathAndQuery = urlObject.pathname + urlObject.search;

  const hmac = await generateHmac(bodyToSign, timestamp, pathAndQuery);

  const headers = new Headers(options.headers);
  headers.set("x-timestamp", String(timestamp));
  headers.set("x-hmac", hmac);

  return fetch(url, { ...options, headers });
}
