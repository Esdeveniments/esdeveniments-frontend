import { describe, it, expect, afterEach } from "vitest";
import { followScrollLockPadding } from "@utils/browser";

const html = document.documentElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("followScrollLockPadding", () => {
  afterEach(() => {
    html.style.paddingRight = "";
  });

  it("mirrors the scroll lock's <html> padding on the bar, then drops it", async () => {
    const bar = document.createElement("div");
    const cleanup = followScrollLockPadding(bar);

    html.style.paddingRight = "6px"; // Headless UI locks scroll
    await flush();
    expect(bar.style.paddingRight).toBe("6px");

    html.style.paddingRight = ""; // unlocked
    await flush();
    expect(bar.style.paddingRight).toBe("");

    html.style.paddingRight = "6px";
    await flush();
    cleanup?.();
    expect(bar.style.paddingRight).toBe("");
    html.style.paddingRight = "8px";
    await flush();
    expect(bar.style.paddingRight).toBe("");
  });
});
