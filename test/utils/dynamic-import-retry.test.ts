import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { retryDynamicImport } from "@utils/dynamic-import-retry";

describe("retryDynamicImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns immediately when the importer succeeds on first attempt", async () => {
    const importer = vi.fn().mockResolvedValue("ok");

    const resultPromise = retryDynamicImport(importer);

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("ok");
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("retries and succeeds on a subsequent attempt", async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("recovered");

    const resultPromise = retryDynamicImport(importer, {
      retries: 3,
      retryDelayMs: 10,
      backoffMultiplier: 1,
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("recovered");
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const importer = vi.fn().mockRejectedValue(new Error("still failing"));

    const promise = retryDynamicImport(importer, {
      retries: 2,
      retryDelayMs: 1,
      backoffMultiplier: 1,
    });

    const expectation = expect(promise).rejects.toThrow("still failing");
    await vi.runAllTimersAsync();
    await expectation;
    expect(importer).toHaveBeenCalledTimes(2);
  });
});

