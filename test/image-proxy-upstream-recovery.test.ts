import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { fetch as undiciFetch } from "undici";
import { GET } from "app/api/image-proxy/route";
import { forgetMissingIssuers, resolveMissingIssuers } from "@utils/tls-aia";
import { fetchWithLenientParser } from "@utils/lenient-http-fetch";
import { IMAGE_PROXY_USER_AGENT } from "@utils/constants";

const { DNS_RECORDS } = vi.hoisted(() => ({
  DNS_RECORDS: [{ address: "203.0.113.10", family: 4 }],
}));

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));
vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({
    isSafe: true,
    dnsRecords: DNS_RECORDS,
  })),
}));
vi.mock("@utils/tls-aia", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/tls-aia")>()),
  resolveMissingIssuers: vi.fn(),
  forgetMissingIssuers: vi.fn(),
}));
vi.mock("@utils/lenient-http-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/lenient-http-fetch")>()),
  fetchWithLenientParser: vi.fn(),
}));

const SOURCE = "https://www.example.cat/agenda/poster.jpg";
const ISSUERS = ["-----BEGIN CERTIFICATE-----"];
let jpeg: Buffer;

beforeAll(async () => {
  jpeg = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#c00" },
  })
    .jpeg()
    .toBuffer();
});

function fetchFailure(code: string) {
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
  vi.mocked(forgetMissingIssuers).mockReset();
  vi.mocked(fetchWithLenientParser).mockReset();
});

describe("image proxy with an incomplete upstream TLS chain", () => {
  it("retries with the intermediates fetched through AIA", async () => {
    vi.mocked(undiciFetch)
      .mockRejectedValueOnce(fetchFailure("UNABLE_TO_VERIFY_LEAF_SIGNATURE"))
      .mockResolvedValueOnce(imageResponse());
    vi.mocked(resolveMissingIssuers).mockResolvedValue(ISSUERS);

    const res = await proxy();

    expect(res.status).toBe(200);
    expect(resolveMissingIssuers).toHaveBeenCalledWith(
      SOURCE,
      DNS_RECORDS,
      expect.any(AbortSignal),
    );
    const [first, retry] = vi.mocked(undiciFetch).mock.calls;
    expect(retry?.[1]?.dispatcher).toBeDefined();
    expect(retry?.[1]?.dispatcher).not.toBe(first?.[1]?.dispatcher);
    expect(retry?.[1]?.redirect).toBe("manual");
    expect(retry?.[1]?.headers).toEqual({ "user-agent": IMAGE_PROXY_USER_AGENT });
    expect(forgetMissingIssuers).not.toHaveBeenCalled();
  });

  it("forgets cached issuers when the retry still has an incomplete chain", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(
      fetchFailure("UNABLE_TO_VERIFY_LEAF_SIGNATURE"),
    );
    vi.mocked(resolveMissingIssuers).mockResolvedValue(ISSUERS);

    const res = await proxy();

    expect(res.status).toBe(502);
    expect(forgetMissingIssuers).toHaveBeenCalledWith(SOURCE);
  });

  it("returns the fallback when the missing issuers can't be resolved", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(
      fetchFailure("UNABLE_TO_GET_ISSUER_CERT_LOCALLY"),
    );
    vi.mocked(resolveMissingIssuers).mockResolvedValue([]);

    const res = await proxy();

    expect(res.status).toBe(502);
    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry other certificate errors", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(fetchFailure("CERT_HAS_EXPIRED"));

    const res = await proxy();

    expect(res.status).toBe(502);
    expect(resolveMissingIssuers).not.toHaveBeenCalled();
  });
});

describe("image proxy with a malformed upstream response header", () => {
  const parserError = Object.assign(new Error("Invalid header value char"), {
    name: "HTTPParserError",
  });

  it.each([
    ["a chunked body", new TypeError("fetch failed", { cause: parserError })],
    ["a Content-Length", fetchFailure("UND_ERR_RES_CONTENT_LENGTH_MISMATCH")],
  ])("re-reads the image with the lenient parser (%s)", async (_, failure) => {
    vi.mocked(undiciFetch).mockRejectedValue(failure);
    vi.mocked(fetchWithLenientParser).mockResolvedValue(imageResponse());

    const res = await proxy();

    expect(res.status).toBe(200);
    expect(fetchWithLenientParser).toHaveBeenCalledWith(
      SOURCE,
      expect.any(AbortSignal),
      DNS_RECORDS,
      true,
    );
    expect(resolveMissingIssuers).not.toHaveBeenCalled();
  });
});

describe("image proxy with an upstream host it can't connect to", () => {
  function proxyFrom(source: string) {
    return GET(
      new Request(`http://localhost/api/image-proxy?url=${encodeURIComponent(source)}`),
    );
  }

  it("skips the host for its other images instead of waiting again", async () => {
    vi.mocked(undiciFetch).mockRejectedValue(fetchFailure("UND_ERR_CONNECT_TIMEOUT"));

    expect((await proxyFrom("https://fitxers.example.cat/agenda/1.jpg")).status).toBe(502);
    expect((await proxyFrom("https://fitxers.example.cat/agenda/2.jpg")).status).toBe(502);

    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps fetching a host that answered with an error status", async () => {
    vi.mocked(undiciFetch).mockResolvedValue(new Response(null, { status: 404 }) as never);

    await proxyFrom("https://other.example.cat/agenda/1.jpg");
    await proxyFrom("https://other.example.cat/agenda/2.jpg");

    expect(undiciFetch).toHaveBeenCalledTimes(2);
  });
});
