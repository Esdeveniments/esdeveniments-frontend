import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeHost,
  isDevelopmentHost,
} from "../utils/host-validation";
import {
  getPublicFetchSafety,
  isBlockedAddress,
  isSafePublicFetchUrl,
} from "../utils/public-fetch-safety";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  lookupMock.mockReset();
});

describe("utils/host-validation", () => {
  it("normalizes host headers without substring matching", () => {
    expect(normalizeHost("LOCALHOST:3000")).toBe("localhost");
    expect(normalizeHost("[::1]:3000")).toBe("::1");
    expect(normalizeHost("attacker-localhost.evil.com")).toBe(
      "attacker-localhost.evil.com",
    );
  });

  it("only treats exact loopback hosts as development hosts", () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";

    expect(isDevelopmentHost("localhost:3000")).toBe(true);
    expect(isDevelopmentHost("127.0.0.1:3000")).toBe(true);
    expect(isDevelopmentHost("[::1]:3000")).toBe(true);
    expect(isDevelopmentHost("attacker-localhost.evil.com")).toBe(false);
  });

  it("does not allow loopback hosts in production", () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    expect(isDevelopmentHost("localhost:3000")).toBe(false);
  });
});

describe("utils/public-fetch-safety", () => {
  it("blocks local and metadata targets in production", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    await expect(isSafePublicFetchUrl("http://localhost:3000/x")).resolves.toBe(
      false,
    );
    await expect(isSafePublicFetchUrl("http://127.0.0.1/x")).resolves.toBe(
      false,
    );
    await expect(isSafePublicFetchUrl("http://169.254.169.254/x")).resolves.toBe(
      false,
    );
    await expect(
      isSafePublicFetchUrl("http://metadata.google.internal/x"),
    ).resolves.toBe(false);
  });

  it("allows exact localhost only in development", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";

    await expect(isSafePublicFetchUrl("http://localhost:3000/x")).resolves.toBe(
      true,
    );
  });

  it("blocks localhost outside development", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";

    await expect(isSafePublicFetchUrl("http://localhost:3000/x")).resolves.toBe(
      false,
    );
  });

  it("allows public IP URLs and rejects credentials or non-HTTP protocols", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    await expect(isSafePublicFetchUrl("https://8.8.8.8/logo.png")).resolves.toBe(
      true,
    );
    await expect(
      isSafePublicFetchUrl("https://user:pass@8.8.8.8/logo.png"),
    ).resolves.toBe(false);
    await expect(isSafePublicFetchUrl("ftp://8.8.8.8/logo.png")).resolves.toBe(
      false,
    );
  });

  it("rejects hostnames that resolve to private addresses", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    lookupMock.mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);

    await expect(
      isSafePublicFetchUrl("https://municipal.example.test/image.jpg"),
    ).resolves.toBe(false);

    expect(lookupMock).toHaveBeenCalledWith("municipal.example.test", {
      all: true,
      verbatim: true,
    });
  });

  it("rejects hostnames with mixed public and private DNS answers", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    lookupMock.mockResolvedValueOnce([
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);

    await expect(
      isSafePublicFetchUrl("https://images.example.test/cartell.jpg"),
    ).resolves.toBe(false);
  });

  it("classifies addresses by range, not by text form", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("::ffff:7f00:1")).toBe(true);
    expect(isBlockedAddress("fd00::1")).toBe(true);
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("2001:4860:4860::8888")).toBe(false);
    expect(isBlockedAddress("fcm.googleapis.com")).toBe(false);
  });

  it.each([
    "http://[::ffff:7f00:1]/x",
    "http://[::ffff:127.0.0.1]/x",
    "http://[::ffff:a9fe:a9fe]/x",
    "http://[::ffff:a00:1]/x",
    "http://[::ffff:0:0]/x",
    "http://[64:ff9b::7f00:1]/x",
    "http://[2002:7f00:1::]/x",
  ])("rejects the non-public IPv6 literal %s", async (url) => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    await expect(isSafePublicFetchUrl(url)).resolves.toBe(false);
  });

  it("rejects hostnames whose AAAA answers map to non-public addresses", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    lookupMock.mockResolvedValueOnce([{ address: "::ffff:7f00:1", family: 6 }]);

    await expect(
      isSafePublicFetchUrl("https://images.example.test/cartell.jpg"),
    ).resolves.toBe(false);
  });

  it("allows a public IPv6 literal", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    await expect(
      isSafePublicFetchUrl("https://[2001:4860:4860::8888]/logo.png"),
    ).resolves.toBe(true);
  });

  it("returns validated DNS records for callers that pin the fetch connection", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    lookupMock.mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }]);

    await expect(
      getPublicFetchSafety("https://images.example.test/cartell.jpg"),
    ).resolves.toEqual({
      isSafe: true,
      dnsRecords: [{ address: "8.8.8.8", family: 4 }],
    });
  });
});
