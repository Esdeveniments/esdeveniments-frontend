// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { GET } from "app/api/image-proxy/route";

vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({ isSafe: true })),
}));

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Browsers read the last type of a comma list, so this header means text/html.
const MIXED_TYPE = "image/png,text/html";

let server: http.Server;
let origin: string;
let hugePng: Buffer;

beforeAll(async () => {
  hugePng = await sharp({
    create: { width: 7200, height: 7200, channels: 3, background: "#000" },
  })
    .png()
    .toBuffer();
  server = http.createServer((req, res) => {
    res
      .writeHead(200, { "content-type": MIXED_TYPE })
      .end(
        req.url === "/page"
          ? "<script>alert(1)</script>"
          : req.url === "/huge"
            ? hugePng
            : PNG,
      );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const proxy = (path: string) =>
  GET(
    new Request(
      `http://localhost/api/image-proxy?url=${encodeURIComponent(origin + path)}`,
    ),
  );

describe("image proxy response type", () => {
  it("refuses a body that is not an image, whatever the upstream header says", async () => {
    const res = await proxy("/page");

    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toBeNull();
  });

  it("answers with the type of the bytes, not the upstream header", async () => {
    const res = await proxy("/image");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'none'; sandbox",
    );
  });

  it("does not decode an image above the pixel limit", async () => {
    const res = await proxy("/huge");

    expect(res.headers.get("x-image-proxy-optimized")).toBe(
      "fallback-sharp-error",
    );
    expect(res.headers.get("x-image-proxy-error")).toContain("pixel limit");
  });
});
