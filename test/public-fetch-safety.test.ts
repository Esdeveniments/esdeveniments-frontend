import { describe, it, expect, afterEach } from "vitest";
import {
  normalizeHost,
  isDevelopmentHost,
} from "../utils/host-validation";
import { isSafePublicFetchUrl } from "../utils/public-fetch-safety";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
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

  it("allows exact localhost only outside production", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";

    await expect(isSafePublicFetchUrl("http://localhost:3000/x")).resolves.toBe(
      true,
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
});