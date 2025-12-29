import { describe, it, expect, beforeEach } from "vitest";
import {
  queueFavoriteRequest,
  resetFavoritesQueue,
} from "@utils/favorites-queue";

describe("favorites-queue", () => {
  beforeEach(() => {
    resetFavoritesQueue();
  });

  it("executes requests sequentially", async () => {
    const executionOrder: number[] = [];

    const request1 = queueFavoriteRequest(async () => {
      await delay(50);
      executionOrder.push(1);
      return "result1";
    });

    const request2 = queueFavoriteRequest(async () => {
      executionOrder.push(2);
      return "result2";
    });

    const [result1, result2] = await Promise.all([request1, request2]);

    expect(executionOrder).toEqual([1, 2]); // Strictly sequential
    expect(result1).toBe("result1");
    expect(result2).toBe("result2");
  });

  it("continues chain after a request fails", async () => {
    const executionOrder: number[] = [];

    const request1 = queueFavoriteRequest(async () => {
      executionOrder.push(1);
      throw new Error("Request 1 failed");
    });

    const request2 = queueFavoriteRequest(async () => {
      executionOrder.push(2);
      return "result2";
    });

    await expect(request1).rejects.toThrow("Request 1 failed");
    const result2 = await request2;

    expect(executionOrder).toEqual([1, 2]); // Request 2 still runs
    expect(result2).toBe("result2");
  });

  it("handles multiple rapid queued requests", async () => {
    const results: number[] = [];

    const requests = Array.from({ length: 5 }, (_, i) =>
      queueFavoriteRequest(async () => {
        await delay(10);
        results.push(i);
        return i;
      })
    );

    const allResults = await Promise.all(requests);

    expect(results).toEqual([0, 1, 2, 3, 4]); // Strictly ordered
    expect(allResults).toEqual([0, 1, 2, 3, 4]);
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
