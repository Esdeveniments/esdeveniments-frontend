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

  const urlObject = new URL(url);
  const pathAndQuery = urlObject.pathname + urlObject.search;

  const hmac = await generateHmac(bodyToSign, timestamp, pathAndQuery);

  const headers = new Headers(options.headers);
  headers.set("x-timestamp", String(timestamp));
  headers.set("x-hmac", hmac);

  options.headers = headers;

  return fetch(url, options);
}
