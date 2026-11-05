import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { fetch as undiciFetch } from "undici";
import { GET } from "app/api/image-proxy/route";
import { resolveMissingIssuers } from "@utils/tls-aia";

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));
vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({
    isSafe: true,
    dnsRecords: [{ address: "203.0.113.10", family: 4 }],
  })),
}));
vi.mock("@utils/tls-aia", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/tls-aia")>()),
  resolveMissingIssuers: vi.fn(),
}));

const SOURCE = "https://www.example.cat/agenda/poster.jpg";
let jpeg: Buffer;

beforeAll(async () => {
  jpeg = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#c00" },
  })
    .jpeg()
    .toBuffer();
});

function tlsFailure(code: string) {
  return new TypeError("fetch failed", {
    cause: Object.assign(new Error(code), { code }),
  });
}

function imageResponse() {
  return new Response(new Uint8Array(jpeg), {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  }) as never;
}

function proxy() {
  return GET(
    new Request(
      `http://localhost/api/image-proxy?url=${encodeURIComponent(SOURCE)}`,
    ),
  );
}

beforeEach(() => {
  vi.mocked(undiciFetch).mockReset();
  vi.mocked(resolveMissingIssuers).mockReset();
});

describe("image proxy with an incomplete upstream TLS chain", () => {
  it("retries with the intermediates fetched through AIA", async () => {
    vi.mocked(undiciFetch)
      .mockRejectedValueOnce(tlsFailure("UNABLE_TO_VERIFY_LEAF_SIGNATURE"))
      .mockResolvedValueOnce(imageResponse());
    vi.mocked(resolveMissingIssuers).mockResolvedValue(["-----BEGIN CERTIFICATE-----"]);

    const res = await proxy();

    expect(res.status).toBe(200);
    expect(resolveMissingIssuers).toHaveBeenCalledWith(
      SOURCE,
      [{ address: "203.0.113.10", family: 4 }],
      expect.any(AbortSignal),
    );
    const [first, retry] = vi.mocked(undiciFetch).mock.calls;
    expect(retry?.[1]?.dispatcher).toBeDefined();
    expect(retry?.[1]?.dispatcher).not.toBe(first?.[1]?.dispatcher);
    expect(retry?.[1]?.redirect).toBe("manual");
  });

  it("returns the fallback when the missing issuers can't be resolved", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(
      tlsFailure("UNABLE_TO_GET_ISSUER_CERT_LOCALLY"),
    );
    vi.mocked(resolveMissingIssuers).mockResolvedValue([]);

    const res = await proxy();

    expect(res.status).toBe(502);
    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry other certificate errors", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(tlsFailure("CERT_HAS_EXPIRED"));

    const res = await proxy();

    expect(res.status).toBe(502);
    expect(resolveMissingIssuers).not.toHaveBeenCalled();
  });
});
