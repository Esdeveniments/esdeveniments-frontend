import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { hasCardImage } from "@utils/event-helpers";
import ClientImage from "@components/ui/common/image/ClientImage";
import type { ListEvent } from "types/api/event";

vi.mock("@components/ui/imgDefault", () => ({ default: () => null }));

const event = (over: Partial<ListEvent>): ListEvent =>
  ({ id: "1", hash: "h", slug: "s", title: "t", imageUrl: null, ...over }) as ListEvent;

describe("hasCardImage", () => {
  it("skips ads and events without an image when picking the LCP card", () => {
    const events = [
      event({ id: "a" }),
      { isAd: true, id: "ad" } as ListEvent,
      event({ id: "b", imageUrl: "https://example.com/b.jpg" }),
    ];
    expect(events.findIndex(hasCardImage)).toBe(2);
  });

  it("returns -1 when no event has an image", () => {
    expect([event({}), event({ id: "2" })].findIndex(hasCardImage)).toBe(-1);
  });
});

describe("ClientImage", () => {
  const props = { title: "Concert", image: "https://example.com/c.jpg" };

  it("renders the image visible before hydration, without a JS fade", () => {
    const { container } = render(<ClientImage {...props} />);
    const img = container.querySelector("img")!;
    expect(img.style.opacity).toBe("");
    expect(container.querySelector(".animate-fast-pulse")).toBeNull();
  });

  it("offers WebP and a fallback, no AVIF source", () => {
    const { container } = render(<ClientImage {...props} />);
    expect(container.querySelector('source[type="image/webp"]')).not.toBeNull();
    expect(container.querySelector('source[type="image/avif"]')).toBeNull();
  });

  it("loads the priority image eagerly with high fetch priority", () => {
    const { container } = render(<ClientImage {...props} priority />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });
});
