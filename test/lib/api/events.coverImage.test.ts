// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "@lib/api/fetch-wrapper";
import { deleteEventImage, replaceEventImage } from "@lib/api/events";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));
vi.mock("@utils/auth-cookies", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
  getAccessTokenFromCookies: vi.fn().mockResolvedValue("tok"),
}));
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "https://api.example.com/api",
  isApiUrlConfigured: () => true,
}));

const mockFetch = vi.mocked(fetchWrapper.fetchWithHmac);
const png = () => new File([new Uint8Array([1])], "c.png", { type: "image/png" });

describe("event cover endpoints", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("PUTs the file as imageFile to /events/{uuid}/image", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ publicId: "p", url: "https://cdn/c.png" })),
    );

    const result = await replaceEventImage("uuid-1", png());

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/events/uuid-1/image");
    expect(init?.method).toBe("PUT");
    expect((init?.body as FormData).get("imageFile")).toBeInstanceOf(File);
    expect(result.url).toBe("https://cdn/c.png");
  });

  it("throws with the status when the backend rejects the cover", async () => {
    mockFetch.mockResolvedValue(new Response("forbidden", { status: 403 }));

    await expect(replaceEventImage("uuid-1", png())).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws when the backend returns a malformed cover payload", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ url: "not-a-url" })));

    await expect(replaceEventImage("uuid-1", png())).rejects.toThrow(
      "invalid response",
    );
  });

  it("DELETEs /events/{uuid}/image", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    await deleteEventImage("uuid-1");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/events/uuid-1/image");
    expect(init?.method).toBe("DELETE");
  });
});
