// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "app/api/image-proxy/route";
import { IMAGE_PROXY_USER_AGENT } from "@utils/constants";

vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({ isSafe: true })),
}));

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Like the CloudFront WAF in front of stasusanna.cat: 403 for undici's
// default User-Agent, the image for ours.
let server: http.Server;
let origin: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.headers["user-agent"] !== IMAGE_PROXY_USER_AGENT) {
      res.writeHead(403, { "content-type": "text/html" }).end("Forbidden");
      return;
    }
    res.writeHead(200, { "content-type": "image/png" }).end(PNG);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

describe("image proxy upstream request", () => {
  it("sends the bot User-Agent that council WAFs accept", async () => {
    const target = encodeURIComponent(`${origin}/@@images/image/great`);
    const res = await GET(new Request(`http://localhost/api/image-proxy?url=${target}`));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
