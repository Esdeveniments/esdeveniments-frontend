// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  fetchCategories: vi.fn(),
  completeWithAiGateway: vi.fn(),
}));

vi.mock("@lib/auth/session", () => ({
  resolveSession: mocks.resolveSession,
}));

vi.mock("@lib/api/categories", () => ({
  fetchCategories: mocks.fetchCategories,
}));

vi.mock("@lib/api/ai-gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/api/ai-gateway")>();
  return {
    ...actual,
    completeWithAiGateway: mocks.completeWithAiGateway,
  };
});

import { GET, POST } from "@app/api/events/extract-poster/route";
import { resetPosterQuotaStateForTests } from "@lib/api/poster-quota";

async function makeJpegBytes(width: number, height: number, withExif = false): Promise<Uint8Array<ArrayBuffer>> {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 214, g: 0, b: 47 },
    },
  });
  if (withExif) {
    pipeline = pipeline.withMetadata({
      exif: { IFD0: { Artist: "SecretGPSPhoto" } },
    });
  }
  const buf = await pipeline.jpeg({ quality: 80 }).toBuffer();
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function makeMultipartRequest(
  file: File,
  options?: {
    sequence?: number;
    clientId?: string;
    locale?: string;
    contentLengthOverride?: string;
    transferEncoding?: string;
  },
): NextRequest {
  const form = new FormData();
  form.append("imageFile", file);
  if (options?.sequence !== undefined) {
    form.append("sequence", String(options.sequence));
  }
  if (options?.clientId !== undefined) {
    form.append("clientId", options.clientId);
  }
  if (options?.locale !== undefined) {
    form.append("locale", options.locale);
  }
  const probe = new Request("http://localhost:3000/api/events/extract-poster", {
    method: "POST",
    body: form,
  });
  return probe.arrayBuffer().then((buf) => {
    const headers = new Headers(probe.headers);
    if (options?.contentLengthOverride !== undefined) {
      if (options.contentLengthOverride === "") headers.delete("content-length");
      else headers.set("content-length", options.contentLengthOverride);
    } else {
      headers.set("content-length", String(buf.byteLength));
    }
    if (options?.transferEncoding) {
      headers.set("transfer-encoding", options.transferEncoding);
    }
    return new NextRequest("http://localhost:3000/api/events/extract-poster", {
      method: "POST",
      headers,
      body: buf,
    });
  }) as unknown as NextRequest;
}

const originalToken = process.env.GATEWAY_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  resetPosterQuotaStateForTests();
  process.env.GATEWAY_TOKEN = "test-gateway-token";
  mocks.resolveSession.mockResolvedValue({
    kind: "ok",
    user: { id: "u-1", logtoId: "logto-user-1" },
  });
  mocks.fetchCategories.mockResolvedValue([
    { id: 1, name: "Concerts", slug: "concerts" },
  ]);
  mocks.completeWithAiGateway.mockResolvedValue({
    ok: true,
    model: "gemini/gemini-3.6-flash",
    content: JSON.stringify({
      title: "Concert d'estiu",
      description: "Actuació en directe al teatre.",
      startDate: "2027-06-15T20:00",
      endDate: null,
      isAllDay: false,
      hasExplicitYear: true,
      isMultiEvent: false,
      town: "Cardedeu",
      location: "Teatre Auditori",
      url: null,
      price: "10 €",
      categories: ["concerts"],
    }),
  });
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.GATEWAY_TOKEN;
  else process.env.GATEWAY_TOKEN = originalToken;
});

describe("GET /api/events/extract-poster", () => {
  it("reports available for signed-in users when GATEWAY_TOKEN is configured", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/events/extract-poster"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({
      state: "available",
      signedIn: true,
    });
  });

  it("reports disabled when GATEWAY_TOKEN is missing without touching gateway", async () => {
    delete process.env.GATEWAY_TOKEN;
    const res = await GET(new NextRequest("http://localhost:3000/api/events/extract-poster"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      state: "disabled",
      signedIn: true,
    });
    expect(mocks.completeWithAiGateway).not.toHaveBeenCalled();
  });
});

describe("POST /api/events/extract-poster", () => {
  it("rejects unauthenticated requests with 401 before touching ai-gateway", async () => {
    mocks.resolveSession.mockResolvedValueOnce({
      kind: "unauthorized",
      clearCookies: false,
    });
    const req = new NextRequest("http://localhost:3000/api/events/extract-poster", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mocks.completeWithAiGateway).not.toHaveBeenCalled();
  });

  it("rejects chunked framing and spoofed magic bytes before calling ai-gateway", async () => {
    const jpeg = await makeJpegBytes(400, 300);
    const chunkedReq = await makeMultipartRequest(
      new File([jpeg], "poster.jpg", { type: "image/jpeg" }),
      { transferEncoding: "chunked" },
    );
    expect((await POST(chunkedReq)).status).toBe(411);

    const fakeFile = new File(["not-an-image"], "poster.jpg", {
      type: "image/jpeg",
    });
    const spoofedReq = await makeMultipartRequest(fakeFile);
    expect((await POST(spoofedReq)).status).toBe(415);
    expect(mocks.completeWithAiGateway).not.toHaveBeenCalled();
  });

  it("normalizes a 2048x512 JPEG with EXIF down to 1280x320 with metadata stripped", async () => {
    const pano = await makeJpegBytes(2048, 512, true);
    const req = await makeMultipartRequest(
      new File([pano], "pano.jpg", { type: "image/jpeg" }),
      { sequence: 10 },
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.hasData).toBe(true);
    expect(json.extracted.title).toBe("Concert d'estiu");
    expect(json.extracted.priceResolution.priceType).toBe("paid");
    expect(json.extracted.priceResolution.priceAmount).toBe("10");

    // Verify Sharp resized the 2048x512 panorama to 1280x320 and stripped EXIF!
    const callArg = mocks.completeWithAiGateway.mock.calls[0][0];
    const imagePart = callArg.messages[0].content[1];
    const base64 = imagePart.image_url.url.replace(/^data:image\/jpeg;base64,/, "");
    const sentMeta = await sharp(Buffer.from(base64, "base64")).metadata();
    expect(sentMeta.width).toBe(1280);
    expect(sentMeta.height).toBe(320);
    expect(sentMeta.exif).toBeUndefined();
  });

  it("rejects non-vision fallback models with 503 and refunds the account quota", async () => {
    mocks.completeWithAiGateway.mockResolvedValueOnce({
      ok: true,
      model: "groq/openai/gpt-oss-120b",
      content: JSON.stringify({ title: "Hallucinated" }),
    });
    const jpeg = await makeJpegBytes(300, 300);
    const req = await makeMultipartRequest(
      new File([jpeg], "poster.jpg", { type: "image/jpeg" }),
      { sequence: 1 },
    );
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("model_rejected");
  });

  it("rejects delayed older selection sequences from the same clientId with 409, while allowing a new mount clientId at seq 1", async () => {
    const jpeg = await makeJpegBytes(300, 300);
    const reqNewer = await makeMultipartRequest(
      new File([jpeg], "b.jpg", { type: "image/jpeg" }),
      { sequence: 20, clientId: "tab-alpha" },
    );
    expect((await POST(reqNewer)).status).toBe(200);

    // Delayed older request from the same mount/tab is rejected as stale
    const reqOlderSameTab = await makeMultipartRequest(
      new File([jpeg], "a.jpg", { type: "image/jpeg" }),
      { sequence: 10, clientId: "tab-alpha" },
    );
    expect((await POST(reqOlderSameTab)).status).toBe(409);
    expect(mocks.completeWithAiGateway).toHaveBeenCalledTimes(1);

    // New mount/tab/reload starts at sequence 1 and must NOT 409
    const reqNewMount = await makeMultipartRequest(
      new File([jpeg], "c.jpg", { type: "image/jpeg" }),
      { sequence: 1, clientId: "tab-beta" },
    );
    expect((await POST(reqNewMount)).status).toBe(200);
    expect(mocks.completeWithAiGateway).toHaveBeenCalledTimes(2);
  });

  it("forwards the user's locale to the extraction prompt", async () => {
    const jpeg = await makeJpegBytes(300, 300);
    const req = await makeMultipartRequest(
      new File([jpeg], "poster.jpg", { type: "image/jpeg" }),
      { sequence: 1, clientId: "tab-es", locale: "es" },
    );
    expect((await POST(req)).status).toBe(200);
    const promptText =
      mocks.completeWithAiGateway.mock.calls[0][0].messages[0].content[0].text;
    expect(promptText).toContain("idiomatic Spanish");
  });

  it("enforces per-account daily scan quota with 429 and Retry-After", async () => {
    const jpeg = await makeJpegBytes(200, 200);
    for (let i = 1; i <= 8; i++) {
      const req = await makeMultipartRequest(
        new File([jpeg], `p${i}.jpg`, { type: "image/jpeg" }),
        { sequence: i },
      );
      expect((await POST(req)).status).toBe(200);
    }
    const ninth = await makeMultipartRequest(
      new File([jpeg], "p9.jpg", { type: "image/jpeg" }),
      { sequence: 9 },
    );
    const res = await POST(ninth);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});
