import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("isBuildPhase", () => {
  const ENV_BACKUP = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
  });

  it("is true when NEXT_PHASE is phase-production-build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    const { isBuildPhase } = await import("@utils/build-phase");
    expect(isBuildPhase).toBe(true);
  });

  it("is false when NEXT_PHASE is unset at runtime", async () => {
    delete process.env.NEXT_PHASE;
    const { isBuildPhase } = await import("@utils/build-phase");
    expect(isBuildPhase).toBe(false);
  });

  it("is false in production with NEXT_PHASE unset (self-hosted runtime, no VERCEL_URL)", async () => {
    // Regression guard for the incident this module's doc comment describes:
    // a NODE_ENV === "production" && !VERCEL_URL fallback used to make this
    // permanently true on self-hosted (Coolify) production, since self-hosted
    // prod never sets VERCEL_URL either. NEXT_PHASE must be the only signal.
    delete process.env.NEXT_PHASE;
    delete process.env.VERCEL_URL;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const { isBuildPhase } = await import("@utils/build-phase");
    expect(isBuildPhase).toBe(false);
  });

  it("is false for other NEXT_PHASE values", async () => {
    process.env.NEXT_PHASE = "phase-development-server";
    const { isBuildPhase } = await import("@utils/build-phase");
    expect(isBuildPhase).toBe(false);
  });
});
