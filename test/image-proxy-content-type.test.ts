// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import sharp from "sharp";
import * as Sentry from "@sentry/nextjs";
import { GET } from "app/api/image-proxy/route";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({ isSafe: true })),
}));

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// An ISO-BMFF ftyp box: size, "ftyp", major brand, version, compatible brands.
const ftyp = (major: string, ...compatible: string[]) => {
  const brands = Buffer.from(major + "\0\0\0\0" + compatible.join(""), "latin1");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(8 + brands.length);
  return Buffer.concat([size, Buffer.from("ftyp"), brands]);
};
const BODIES: Record<string, Buffer | string> = {
  "/page": "<script>alert(1)</script>",
  "/image": PNG,
  "/avif-mif1": ftyp("mif1", "mif1", "avif", "miaf"),
  "/avif-avis": ftyp("avis", "avis", "msf1"),
  "/heic": ftyp("heic", "mif1", "heic"),
  // Starts like a PNG, so it reaches Sharp, which cannot decode it.
  "/broken": Buffer.concat([PNG.subarray(0, 16), Buffer.alloc(20_000)]),
};

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
      .end(req.url === "/huge" ? hugePng : BODIES[req.url ?? ""]);
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

  it.each(["/avif-mif1", "/avif-avis"])("accepts the AVIF brands of %s", async (path) => {
    const res = await proxy(path);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/avif");
  });

  it("refuses HEIC, which shares AVIF's container", async () => {
    expect((await proxy("/heic")).status).toBe(502);
  });

  describe("on the production server", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.mocked(Sentry.captureException).mockClear();
    });
    afterEach(() => vi.unstubAllEnvs());

    it("does not decode an image above the pixel limit, and Sentry stays quiet", async () => {
      const res = await proxy("/huge");

      expect(res.headers.get("x-image-proxy-optimized")).toBe(
        "fallback-sharp-error",
      );
      expect(res.headers.get("x-image-proxy-error")).toContain("pixel limit");
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("still reports an image Sharp cannot decode", async () => {
      const res = await proxy("/broken");

      expect(res.headers.get("x-image-proxy-optimized")).toBe(
        "fallback-sharp-error",
      );
      expect(Sentry.captureException).toHaveBeenCalledOnce();
    });
  });
});
