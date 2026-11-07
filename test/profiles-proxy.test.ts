import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchWithHmac = vi.fn();
vi.mock("../lib/api/fetch-wrapper", () => ({ fetchWithHmac }));
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "https://api.example.com/api",
  isApiUrlConfigured: () => true,
}));

const load = async () => {
  vi.resetModules();
  return (await import("@lib/api/profiles-proxy")).isProfileMissingForProxy;
};

describe("isProfileMissingForProxy", () => {
  beforeEach(() => fetchWithHmac.mockReset());

  it("is missing only when the backend answers 404", async () => {
    fetchWithHmac.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await (await load())("nobody")).toBe(true);
    expect(fetchWithHmac.mock.calls[0][0]).toBe(
      "https://api.example.com/api/users/nobody",
    );
  });

  it("is not missing when the profile exists", async () => {
    fetchWithHmac.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await (await load())("somebody")).toBe(false);
  });

  it.each([
    ["a 5xx", () => fetchWithHmac.mockResolvedValue(new Response(null, { status: 503 }))],
    ["a timeout", () => fetchWithHmac.mockRejectedValue(new DOMException("t", "TimeoutError"))],
  ])("fails open on %s and doesn't cache it", async (_, arrange) => {
    arrange();
    const isMissing = await load();
    expect(await isMissing("somebody")).toBe(false);
    fetchWithHmac.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await isMissing("somebody")).toBe(true);
  });

  it("caches the answer per username", async () => {
    fetchWithHmac.mockResolvedValue(new Response(null, { status: 404 }));
    const isMissing = await load();
    await isMissing("nobody");
    await isMissing("nobody");
    expect(fetchWithHmac).toHaveBeenCalledTimes(1);
  });
});
