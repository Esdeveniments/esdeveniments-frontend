// @vitest-environment node
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR, MAX_SPONSOR_IMAGE_BYTES } from "@utils/constants";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

// Real HTTP round trip against a stand-in for backend POST /api/sponsors/images
// (backend issue #49). This checks the frontend's half of that contract only.
type Seen = { method?: string; url?: string; headers: IncomingHttpHeaders; body: Buffer };
let server: Server;
let seen: Seen[] = [];
let reply: { status: number; body: unknown; headers?: Record<string, string> };

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
      res.writeHead(reply.status, { "Content-Type": "application/json", ...reply.headers });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  process.env.BACKEND_SERVICE_SECRET = "k".repeat(64);
  process.env.HMAC_SECRET = "h".repeat(32);
});
afterAll(
  () =>
    new Promise<void>((resolve) => {
      // fetch keeps sockets alive; close() alone would wait for them forever.
      server.close(() => resolve());
      server.closeAllConnections();
    }),
);
beforeEach(() => {
  seen = [];
  reply = { status: 200, body: { publicId: "sponsors/abc", url: "https://img.example/sponsors/abc.png" } };
});

const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], "banner.png", { type: "image/png" });

describe("uploadSponsorImage against POST /api/sponsors/images", () => {
  it("sends the file as multipart `imageFile` with the service key and no user token", async () => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");

    await expect(uploadSponsorImage(png())).resolves.toEqual({
      publicId: "sponsors/abc",
      url: "https://img.example/sponsors/abc.png",
    });

    expect(seen).toHaveLength(1);
    const [request] = seen;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api/sponsors/images");
    expect(request.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.body.toString("latin1")).toMatch(/name="imageFile"; filename="banner\.png"/);
    expect(request.headers["x-backend-key"]).toBe("k".repeat(64));
    expect(request.headers.authorization).toBeUndefined();
    expect(request.headers.cookie).toBeUndefined();
  });

  it.each([
    [401, /HTTP 401/],
    [500, /HTTP 500/],
  ])("surfaces a %s from the backend", async (status, message) => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");
    reply = { status, body: { error: "nope" } };
    await expect(uploadSponsorImage(png())).rejects.toThrow(message);
  });

  it("maps 413 to the too-large message", async () => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");
    reply = { status: 413, body: {} };
    await expect(uploadSponsorImage(png())).rejects.toThrow(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
  });

  it("does not follow a redirect carrying the service key elsewhere", async () => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");
    reply = { status: 302, body: {}, headers: { Location: "https://evil.example/steal" } };
    await expect(uploadSponsorImage(png())).rejects.toThrow(/HTTP 302/);
    expect(seen).toHaveLength(1);
  });

  it("rejects a malformed success body", async () => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");
    reply = { status: 200, body: { url: "not a url" } };
    await expect(uploadSponsorImage(png())).rejects.toThrow(/invalid response/);
  });

  it("refuses an oversized file without calling the backend", async () => {
    const { uploadSponsorImage } = await import("@lib/api/sponsors-external");
    const huge = new File([new Uint8Array(MAX_SPONSOR_IMAGE_BYTES + 1)], "big.png", { type: "image/png" });
    await expect(uploadSponsorImage(huge)).rejects.toThrow(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
    expect(seen).toHaveLength(0);
  });
});
