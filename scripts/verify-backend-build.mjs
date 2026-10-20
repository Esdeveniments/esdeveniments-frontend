import { createHmac } from "node:crypto";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const key = process.env.BACKEND_SERVICE_SECRET;
const legacyKey = process.env.HMAC_SECRET;

if (!apiUrl || !key || !legacyKey) {
  console.error("Build requires NEXT_PUBLIC_API_URL, BACKEND_SERVICE_SECRET and HMAC_SECRET.");
  process.exit(1);
}

try {
  for (const path of ["/categories", "/events/promoted?placement=CATALONIA&size=1"]) {
    const url = new URL(`${apiUrl.replace(/\/+$/, "")}${path}`);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", legacyKey)
      .update(`${timestamp}${url.pathname}${url.search}`).digest("hex");
    const response = await fetch(url, {
      headers: {
        "X-Backend-Key": key, Accept: "application/json",
        "x-timestamp": timestamp, "x-hmac": signature,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Backend build authentication check failed: HTTP ${response.status}`);
    }
    if (!Array.isArray(await response.json())) {
      throw new Error("Backend build check returned an invalid v2 response.");
    }
  }
  console.log("Backend v2 build access verified.");
} catch (error) {
  // Do not print request headers, backend bodies, or credential-bearing URLs.
  console.error(
    error instanceof Error && error.message.startsWith("Backend build")
      ? error.message
      : "Backend build check failed: unreachable backend or invalid response.",
  );
  process.exit(1);
}
