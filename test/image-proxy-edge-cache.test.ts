import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { fetch as undiciFetch } from "undici";
import { GET } from "app/api/image-proxy/route";

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));
vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({ isSafe: true, dnsRecords: [] })),
}));

const SOURCE = "https://images.example.com/poster.jpg";
let jpeg: Buffer;

beforeAll(async () => {
  // Noise so the JPEG stays above the 10 KB optimisation threshold.
  const raw = Buffer.alloc(400 * 300 * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 251;
  jpeg = await sharp(raw, { raw: { width: 400, height: 300, channels: 3 } })
    .jpeg({ quality: 90 })
    .toBuffer();
});

beforeEach(() => {
  vi.mocked(undiciFetch).mockImplementation(
    async () =>
      new Response(new Uint8Array(jpeg), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }) as never,
  );
});

function proxy(query: string, accept: string) {
  return GET(
    new Request(
      `http://localhost/api/image-proxy?url=${encodeURIComponent(SOURCE)}&w=300${query}`,
      { headers: { accept } },
    ),
  );
}

describe("image proxy responses are cacheable by URL alone", () => {
  it("returns the same type for the same URL whatever the Accept header says", async () => {
    const modern = await proxy("", "image/avif,image/webp,*/*");
    const legacy = await proxy("", "image/jpeg,*/*");

    expect(modern.status).toBe(200);
    expect(modern.headers.get("content-type")).toBe("image/jpeg");
    expect(legacy.headers.get("content-type")).toBe("image/jpeg");
    expect(modern.headers.get("vary") ?? "").not.toMatch(/accept(?!-)/i);
  });

  it("serves WebP when the URL asks for it", async () => {
    const res = await proxy("&format=webp", "*/*");

    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("s-maxage=");
  });
});
